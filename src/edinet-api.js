import axios from 'axios';

const EDINET_API_BASE = 'https://disclosure.edinet-fsa.go.jp/api/v2';

// API key should be set via environment variable or passed to functions
const EDINET_API_KEY = process.env.EDINET_API_KEY || '';

/**
 * Search for Japanese companies by name
 * @param {string} query - Company name to search (Japanese or English)
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchCompanies(query, options = {}) {
  const { limit = 10, date } = options;

  try {
    // Get recent filings and search within them for company name
    const searchDate = date || new Date().toISOString().split('T')[0];

    const response = await axios.get(`${EDINET_API_BASE}/documents.json`, {
      params: {
        date: searchDate.replace(/-/g, ''),
        type: 2, // Type 2: Metadata only
      },
      headers: {
        'Subscription-Key': EDINET_API_KEY
      },
      timeout: 15000
    });

    if (!response.data || !response.data.results) {
      return {
        query,
        companies: [],
        total_found: 0,
        country: 'JP',
        source: 'EDINET API',
        note: 'No results found for the specified date'
      };
    }

    // Filter results by company name
    const queryLower = query.toLowerCase();
    const matchingCompanies = response.data.results
      .filter(doc => {
        const name = (doc.filerName || '').toLowerCase();
        return name.includes(queryLower);
      })
      .slice(0, limit)
      .map(doc => ({
        name: doc.filerName,
        edinet_code: doc.edinetCode,
        sec_code: doc.secCode || null,
        jcn: doc.JCN || null,
        recent_filing: {
          document_id: doc.docID,
          document_type: doc.docTypeCode,
          document_description: doc.docDescription,
          period_start: doc.periodStart,
          period_end: doc.periodEnd,
          submit_date: doc.submitDateTime
        }
      }));

    return {
      query,
      companies: matchingCompanies,
      total_found: matchingCompanies.length,
      country: 'JP',
      source: 'EDINET API',
      date_searched: searchDate
    };

  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('EDINET API key is required. Please set EDINET_API_KEY environment variable.');
    }
    throw new Error(`EDINET company search failed: ${error.message}`);
  }
}

/**
 * Get company information by EDINET code
 * @param {string} edinetCode - EDINET code (E-number)
 * @returns {Promise<Object>} Company information
 */
export async function getCompanyByEdinetCode(edinetCode) {
  try {
    // Get recent filings for this company
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    const filings = await getCompanyFilings(edinetCode, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      limit: 1
    });

    if (!filings.filings || filings.filings.length === 0) {
      throw new Error(`No filings found for EDINET code: ${edinetCode}`);
    }

    const latestFiling = filings.filings[0];

    return {
      edinet_code: edinetCode,
      name: latestFiling.filer_name,
      sec_code: latestFiling.sec_code,
      jcn: latestFiling.jcn,
      latest_filing: {
        document_id: latestFiling.document_id,
        submit_date: latestFiling.submit_date,
        document_type: latestFiling.document_type
      },
      country: 'JP',
      source: 'EDINET API'
    };

  } catch (error) {
    throw new Error(`Failed to get company by EDINET code: ${error.message}`);
  }
}

/**
 * Get company filings by EDINET code
 * @param {string} edinetCode - EDINET code
 * @param {Object} options - Options (startDate, endDate, limit)
 * @returns {Promise<Object>} Filings list
 */
export async function getCompanyFilings(edinetCode, options = {}) {
  const { startDate, endDate, limit = 100 } = options;

  try {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const allFilings = [];

    // Iterate through dates to find filings for this company
    const currentDate = new Date(start);

    while (currentDate <= end && allFilings.length < limit) {
      const dateStr = currentDate.toISOString().split('T')[0].replace(/-/g, '');

      try {
        const response = await axios.get(`${EDINET_API_BASE}/documents.json`, {
          params: {
            date: dateStr,
            type: 2
          },
          headers: {
            'Subscription-Key': EDINET_API_KEY
          },
          timeout: 15000
        });

        if (response.data?.results) {
          const companyFilings = response.data.results
            .filter(doc => doc.edinetCode === edinetCode)
            .map(doc => ({
              document_id: doc.docID,
              edinet_code: doc.edinetCode,
              sec_code: doc.secCode,
              jcn: doc.JCN,
              filer_name: doc.filerName,
              document_type: doc.docTypeCode,
              document_description: doc.docDescription,
              period_start: doc.periodStart,
              period_end: doc.periodEnd,
              submit_date: doc.submitDateTime,
              xbrl_flag: doc.xbrlFlag === '1',
              pdf_flag: doc.pdfFlag === '1',
              urls: {
                document: `${EDINET_API_BASE}/documents/${doc.docID}`,
                viewer: `https://disclosure.edinet-fsa.go.jp/EKW0EZ0001.html?docID=${doc.docID}`
              }
            }));

          allFilings.push(...companyFilings);
        }
      } catch (error) {
        // Skip dates with errors
      }

      // Move to next date
      currentDate.setDate(currentDate.getDate() + 1);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      edinet_code: edinetCode,
      filings: allFilings.slice(0, limit),
      total_found: allFilings.length,
      date_range: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      source: 'EDINET API'
    };

  } catch (error) {
    throw new Error(`Failed to get company filings: ${error.message}`);
  }
}

/**
 * Get filing document (download)
 * @param {string} docId - Document ID
 * @param {string} type - Document type (1: submission, 2: PDF, 3: attachments, 4: XBRL)
 * @returns {Promise<Object>} Document data
 */
export async function getFilingDocument(docId, type = '1') {
  try {
    const response = await axios.get(`${EDINET_API_BASE}/documents/${docId}`, {
      params: { type },
      headers: {
        'Subscription-Key': EDINET_API_KEY
      },
      responseType: type === '4' ? 'arraybuffer' : 'stream',
      timeout: 30000
    });

    return {
      document_id: docId,
      type: type === '1' ? 'submission' : type === '2' ? 'pdf' : type === '3' ? 'attachments' : 'xbrl',
      data: response.data,
      content_type: response.headers['content-type']
    };

  } catch (error) {
    throw new Error(`Failed to download document: ${error.message}`);
  }
}

/**
 * Get documents list for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Documents list
 */
export async function getDocumentsByDate(date) {
  try {
    const dateStr = date.replace(/-/g, '');

    const response = await axios.get(`${EDINET_API_BASE}/documents.json`, {
      params: {
        date: dateStr,
        type: 2
      },
      headers: {
        'Subscription-Key': EDINET_API_KEY
      },
      timeout: 15000
    });

    if (!response.data || !response.data.results) {
      return {
        date,
        documents: [],
        total_count: 0,
        source: 'EDINET API'
      };
    }

    return {
      date,
      documents: response.data.results.map(doc => ({
        document_id: doc.docID,
        edinet_code: doc.edinetCode,
        sec_code: doc.secCode,
        filer_name: doc.filerName,
        document_type: doc.docTypeCode,
        document_description: doc.docDescription,
        period_start: doc.periodStart,
        period_end: doc.periodEnd,
        submit_date: doc.submitDateTime,
        xbrl_flag: doc.xbrlFlag === '1'
      })),
      total_count: response.data.metadata?.resultset?.count || response.data.results.length,
      source: 'EDINET API'
    };

  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('EDINET API key is required. Please set EDINET_API_KEY environment variable.');
    }
    throw new Error(`Failed to get documents by date: ${error.message}`);
  }
}

export default {
  searchCompanies,
  getCompanyByEdinetCode,
  getCompanyFilings,
  getFilingDocument,
  getDocumentsByDate
};
