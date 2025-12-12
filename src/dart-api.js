import axios from 'axios';

const DART_API_BASE = 'https://opendart.fss.or.kr/api';

// API key should be set via environment variable
const DART_API_KEY = process.env.DART_API_KEY || '';

/**
 * Search Korean companies by name
 * @param {string} query - Company name to search
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchCompanies(query, options = {}) {
  const { limit = 10 } = options;

  try {
    // Get company list (corp_code.xml contains all companies)
    // For now, we'll search through recent disclosures
    const response = await axios.get(`${DART_API_BASE}/list.json`, {
      params: {
        crtfc_key: DART_API_KEY,
        corp_name: query,
        bgn_de: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, ''),
        end_de: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        page_count: limit
      },
      timeout: 15000
    });

    if (response.data.status !== '000') {
      throw new Error(`DART API error: ${response.data.message}`);
    }

    const companies = [];
    const seenCodes = new Set();

    if (response.data.list) {
      for (const item of response.data.list) {
        if (!seenCodes.has(item.corp_code)) {
          seenCodes.add(item.corp_code);
          companies.push({
            name: item.corp_name,
            corp_code: item.corp_code,
            stock_code: item.stock_code || null,
            recent_filing: {
              report_name: item.report_nm,
              receipt_number: item.rcept_no,
              report_date: item.rcept_dt,
              remarks: item.rm
            }
          });

          if (companies.length >= limit) break;
        }
      }
    }

    return {
      query,
      companies,
      total_found: companies.length,
      country: 'KR',
      source: 'DART Open API'
    };

  } catch (error) {
    if (error.response?.data?.status === '020') {
      throw new Error('DART API key is required or invalid. Please set DART_API_KEY environment variable.');
    }
    throw new Error(`DART company search failed: ${error.message}`);
  }
}

/**
 * Get company information by corporate code
 * @param {string} corpCode - Corporate code
 * @returns {Promise<Object>} Company information
 */
export async function getCompanyByCorpCode(corpCode) {
  try {
    const response = await axios.get(`${DART_API_BASE}/company.json`, {
      params: {
        crtfc_key: DART_API_KEY,
        corp_code: corpCode
      },
      timeout: 15000
    });

    if (response.data.status !== '000') {
      throw new Error(`DART API error: ${response.data.message}`);
    }

    return {
      corp_code: corpCode,
      name: response.data.corp_name,
      name_eng: response.data.corp_name_eng,
      stock_code: response.data.stock_code,
      ceo_name: response.data.ceo_nm,
      corporation_number: response.data.corp_cls,
      legal_form: response.data.corp_cls,
      business_registration_number: response.data.bizr_no,
      address: response.data.adres,
      homepage: response.data.hm_url,
      phone: response.data.phn_no,
      establishment_date: response.data.est_dt,
      accounting_month: response.data.acc_mt,
      country: 'KR',
      source: 'DART Open API'
    };

  } catch (error) {
    throw new Error(`Failed to get company by corp code: ${error.message}`);
  }
}

/**
 * Get company filings/disclosures
 * @param {string} corpCode - Corporate code
 * @param {Object} options - Options (startDate, endDate, reportType, limit)
 * @returns {Promise<Object>} Filings list
 */
export async function getCompanyFilings(corpCode, options = {}) {
  const {
    startDate,
    endDate,
    reportType = '', // A: Annual, Q: Quarterly, etc.
    limit = 100
  } = options;

  try {
    const start = startDate ? startDate.replace(/-/g, '') : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
    const end = endDate ? endDate.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');

    const response = await axios.get(`${DART_API_BASE}/list.json`, {
      params: {
        crtfc_key: DART_API_KEY,
        corp_code: corpCode,
        bgn_de: start,
        end_de: end,
        pblntf_ty: reportType,
        page_count: limit
      },
      timeout: 15000
    });

    if (response.data.status !== '000') {
      throw new Error(`DART API error: ${response.data.message}`);
    }

    const filings = (response.data.list || []).map(item => ({
      corp_code: item.corp_code,
      corp_name: item.corp_name,
      stock_code: item.stock_code,
      report_name: item.report_nm,
      receipt_number: item.rcept_no,
      filing_date: item.flr_nm,
      report_date: item.rcept_dt,
      remarks: item.rm,
      urls: {
        viewer: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
        document: `${DART_API_BASE}/document.xml?crtfc_key=${DART_API_KEY}&rcept_no=${item.rcept_no}`
      }
    }));

    return {
      corp_code: corpCode,
      filings,
      total_found: filings.length,
      date_range: {
        start: startDate || start,
        end: endDate || end
      },
      source: 'DART Open API'
    };

  } catch (error) {
    throw new Error(`Failed to get company filings: ${error.message}`);
  }
}

/**
 * Get financial statements for a company
 * @param {string} corpCode - Corporate code
 * @param {string} businessYear - Business year (YYYY)
 * @param {string} reportCode - Report code (11013: Q1, 11012: Q2, 11014: Q3, 11011: Annual)
 * @returns {Promise<Object>} Financial statements
 */
export async function getFinancialStatements(corpCode, businessYear, reportCode = '11011') {
  try {
    // Get consolidated financial statements
    const response = await axios.get(`${DART_API_BASE}/fnlttSinglAcntAll.json`, {
      params: {
        crtfc_key: DART_API_KEY,
        corp_code: corpCode,
        bsns_year: businessYear,
        reprt_code: reportCode
      },
      timeout: 15000
    });

    if (response.data.status !== '000') {
      throw new Error(`DART API error: ${response.data.message}`);
    }

    return {
      corp_code: corpCode,
      business_year: businessYear,
      report_code: reportCode,
      report_type: reportCode === '11011' ? 'Annual' : reportCode === '11013' ? 'Q1' : reportCode === '11012' ? 'Q2' : 'Q3',
      statements: response.data.list || [],
      source: 'DART Open API',
      note: 'Financial statement items with account names, values, and classifications'
    };

  } catch (error) {
    throw new Error(`Failed to get financial statements: ${error.message}`);
  }
}

/**
 * Get major shareholder information
 * @param {string} corpCode - Corporate code
 * @returns {Promise<Object>} Major shareholder data
 */
export async function getMajorShareholders(corpCode) {
  try {
    const response = await axios.get(`${DART_API_BASE}/majorstock.json`, {
      params: {
        crtfc_key: DART_API_KEY,
        corp_code: corpCode
      },
      timeout: 15000
    });

    if (response.data.status !== '000') {
      throw new Error(`DART API error: ${response.data.message}`);
    }

    return {
      corp_code: corpCode,
      shareholders: (response.data.list || []).map(item => ({
        report_date: item.rcept_dt,
        shareholder_name: item.nm,
        relation: item.relate,
        shares_owned: item.stock_knd,
        ownership_percent: item.hold_stock_ratio,
        change_reason: item.change_cause
      })),
      source: 'DART Open API'
    };

  } catch (error) {
    throw new Error(`Failed to get major shareholders: ${error.message}`);
  }
}

/**
 * Get company executive information
 * @param {string} corpCode - Corporate code
 * @returns {Promise<Object>} Executive information
 */
export async function getExecutiveInfo(corpCode) {
  try {
    const response = await axios.get(`${DART_API_BASE}/exctvSttus.json`, {
      params: {
        crtfc_key: DART_API_KEY,
        corp_code: corpCode
      },
      timeout: 15000
    });

    if (response.data.status !== '000') {
      throw new Error(`DART API error: ${response.data.message}`);
    }

    return {
      corp_code: corpCode,
      executives: (response.data.list || []).map(item => ({
        name: item.nm,
        position: item.sexdstn,
        registration_date: item.rcept_dt,
        birth_year: item.birth_ym,
        career: item.career
      })),
      source: 'DART Open API'
    };

  } catch (error) {
    throw new Error(`Failed to get executive information: ${error.message}`);
  }
}

/**
 * Get dividend information
 * @param {string} corpCode - Corporate code
 * @param {string} businessYear - Business year (YYYY)
 * @returns {Promise<Object>} Dividend information
 */
export async function getDividendInfo(corpCode, businessYear) {
  try {
    const response = await axios.get(`${DART_API_BASE}/alotMatter.json`, {
      params: {
        crtfc_key: DART_API_KEY,
        corp_code: corpCode,
        bsns_year: businessYear
      },
      timeout: 15000
    });

    if (response.data.status !== '000') {
      throw new Error(`DART API error: ${response.data.message}`);
    }

    return {
      corp_code: corpCode,
      business_year: businessYear,
      dividends: response.data.list || [],
      source: 'DART Open API'
    };

  } catch (error) {
    throw new Error(`Failed to get dividend information: ${error.message}`);
  }
}

/**
 * Filter filings by criteria
 * @param {Array} filings - Array of filings
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered filings
 */
export function filterFilings(filings, filters = {}) {
  const { startDate, endDate, reportType, hasXbrl } = filters;

  return filings.filter(filing => {
    if (startDate && filing.report_date < startDate.replace(/-/g, '')) return false;
    if (endDate && filing.report_date > endDate.replace(/-/g, '')) return false;
    if (reportType && !filing.report_name.includes(reportType)) return false;
    // Note: hasXbrl filter would require additional metadata
    return true;
  });
}

export default {
  searchCompanies,
  getCompanyByCorpCode,
  getCompanyFilings,
  getFinancialStatements,
  getMajorShareholders,
  getExecutiveInfo,
  getDividendInfo,
  filterFilings
};
