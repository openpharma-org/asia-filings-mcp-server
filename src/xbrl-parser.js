import * as cheerio from 'cheerio';

/**
 * Parse XBRL data from various Asian taxonomies (J-GAAP, K-GAAP)
 * Handles both inline XBRL (iXBRL) and XBRL-JSON formats
 */

/**
 * Parse value from text, handling Japanese/Korean number formats
 * @param {string} text - Text to parse
 * @returns {number|null} Parsed numeric value or null
 */
function parseFactValue(text) {
  if (!text || typeof text !== 'string') return null;

  // Remove common separators and whitespace
  let cleaned = text.trim()
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .replace(/　/g, ''); // Japanese full-width space

  // Handle negative numbers (Japanese/Korean formats)
  const isNegative = cleaned.includes('△') || cleaned.includes('▲') || cleaned.includes('－') || cleaned.startsWith('-');
  cleaned = cleaned.replace(/[△▲－-]/g, '');

  // Try to parse as number
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return isNegative ? -num : num;
}

/**
 * Extract XBRL facts from inline XBRL (iXBRL) HTML document
 * Used for Japanese EDINET filings
 * @param {string} htmlContent - HTML content with iXBRL tags
 * @param {Object} options - Parsing options
 * @returns {Object} Parsed XBRL data
 */
export function parseIXBRL(htmlContent, options = {}) {
  const { includeNonNumeric = false } = options;

  try {
    const $ = cheerio.load(htmlContent, {
      xmlMode: false,
      decodeEntities: true
    });

    const facts = [];
    const contexts = {};
    const units = {};

    // Parse contexts
    $('xbrli\\:context, context').each((i, elem) => {
      const contextId = $(elem).attr('id');
      const period = $(elem).find('xbrli\\:period, period');
      const entity = $(elem).find('xbrli\\:entity, entity');

      contexts[contextId] = {
        id: contextId,
        entity: $(entity).find('xbrli\\:identifier, identifier').text(),
        period: {
          instant: $(period).find('xbrli\\:instant, instant').text(),
          startDate: $(period).find('xbrli\\:startDate, startDate').text(),
          endDate: $(period).find('xbrli\\:endDate, endDate').text()
        },
        dimensions: {}
      };

      // Parse explicit dimensions
      $(elem).find('xbrldi\\:explicitMember, explicitMember').each((j, dimElem) => {
        const dimension = $(dimElem).attr('dimension');
        const member = $(dimElem).text();
        contexts[contextId].dimensions[dimension] = member;
      });
    });

    // Parse units
    $('xbrli\\:unit, unit').each((i, elem) => {
      const unitId = $(elem).attr('id');
      const measure = $(elem).find('xbrli\\:measure, measure').text();
      units[unitId] = measure;
    });

    // Parse inline XBRL facts (ix:nonFraction for numeric values)
    $('ix\\:nonFraction, ix\\:nonfraction').each((i, elem) => {
      const $elem = $(elem);
      const name = $elem.attr('name');
      const contextRef = $elem.attr('contextRef');
      const unitRef = $elem.attr('unitRef');
      const decimals = $elem.attr('decimals');
      const scale = $elem.attr('scale') || '0';
      const format = $elem.attr('format');

      const text = $elem.text();
      let value = parseFactValue(text);

      // Apply scale
      if (value !== null && scale) {
        const scaleNum = parseInt(scale, 10);
        value = value * Math.pow(10, scaleNum);
      }

      if (value !== null || includeNonNumeric) {
        const [namespace, concept] = name.includes(':') ? name.split(':', 2) : ['unknown', name];

        facts.push({
          namespace,
          concept,
          value,
          rawValue: text,
          contextRef,
          unitRef,
          unit: units[unitRef],
          decimals,
          scale,
          format,
          context: contexts[contextRef],
          period: contexts[contextRef]?.period,
          dimensions: contexts[contextRef]?.dimensions || {}
        });
      }
    });

    // Parse inline XBRL text facts (ix:nonNumeric for text values)
    if (includeNonNumeric) {
      $('ix\\:nonNumeric, ix\\:nonnumeric').each((i, elem) => {
        const $elem = $(elem);
        const name = $elem.attr('name');
        const contextRef = $elem.attr('contextRef');

        const [namespace, concept] = name.includes(':') ? name.split(':', 2) : ['unknown', name];

        facts.push({
          namespace,
          concept,
          value: null,
          rawValue: $elem.text(),
          contextRef,
          context: contexts[contextRef],
          period: contexts[contextRef]?.period,
          dimensions: contexts[contextRef]?.dimensions || {},
          type: 'text'
        });
      });
    }

    return {
      facts,
      contexts,
      units,
      total_facts: facts.length,
      numeric_facts: facts.filter(f => f.value !== null).length,
      source: 'iXBRL Parser'
    };

  } catch (error) {
    throw new Error(`Failed to parse iXBRL: ${error.message}`);
  }
}

/**
 * Parse XBRL from JSON format
 * Used for Korean DART financial statements
 * @param {Object} jsonData - XBRL data in JSON format
 * @returns {Object} Parsed XBRL data
 */
export function parseXBRLJSON(jsonData) {
  try {
    const facts = [];

    // DART returns financial statements as array of line items
    if (Array.isArray(jsonData.list)) {
      jsonData.list.forEach(item => {
        // Each item has account_nm (account name), thstrm_amount (current term amount), etc.
        const value = parseFactValue(item.thstrm_amount || item.frmtrm_amount || '0');

        facts.push({
          namespace: 'k-gaap',
          concept: item.account_id || item.account_nm,
          accountName: item.account_nm,
          accountId: item.account_id,
          value,
          rawValue: item.thstrm_amount || item.frmtrm_amount,
          currency: item.currency || 'KRW',
          period: {
            year: item.bsns_year,
            reportType: item.reprt_code
          },
          // Additional Korean-specific fields
          currentTerm: parseFactValue(item.thstrm_amount),
          previousTerm: parseFactValue(item.frmtrm_amount),
          beforePreviousTerm: parseFactValue(item.bfefrmtrm_amount),
          ord: item.ord, // Order/sequence
          source: 'DART'
        });
      });
    }

    return {
      facts,
      total_facts: facts.length,
      numeric_facts: facts.filter(f => f.value !== null).length,
      source: 'XBRL-JSON Parser (DART)'
    };

  } catch (error) {
    throw new Error(`Failed to parse XBRL JSON: ${error.message}`);
  }
}

/**
 * Classify fact type based on concept name and taxonomy
 * @param {string} concept - XBRL concept name
 * @param {string} taxonomy - Taxonomy (J-GAAP, K-GAAP, etc.)
 * @returns {string} Fact type classification
 */
export function classifyFact(concept, taxonomy = 'unknown') {
  const conceptLower = concept.toLowerCase();

  // Revenue concepts
  if (conceptLower.includes('revenue') || conceptLower.includes('sales') ||
      conceptLower.includes('매출') || conceptLower.includes('수익')) {
    return 'Revenue';
  }

  // Asset concepts
  if (conceptLower.includes('asset') || conceptLower.includes('자산')) {
    if (conceptLower.includes('current') || conceptLower.includes('유동')) {
      return 'Current Assets';
    }
    if (conceptLower.includes('noncurrent') || conceptLower.includes('non-current') || conceptLower.includes('비유동')) {
      return 'Non-current Assets';
    }
    return 'Assets';
  }

  // Liability concepts
  if (conceptLower.includes('liabilit') || conceptLower.includes('부채')) {
    if (conceptLower.includes('current') || conceptLower.includes('유동')) {
      return 'Current Liabilities';
    }
    if (conceptLower.includes('noncurrent') || conceptLower.includes('non-current') || conceptLower.includes('비유동')) {
      return 'Non-current Liabilities';
    }
    return 'Liabilities';
  }

  // Equity concepts
  if (conceptLower.includes('equity') || conceptLower.includes('자본')) {
    return 'Equity';
  }

  // Income/Profit concepts
  if (conceptLower.includes('income') || conceptLower.includes('profit') ||
      conceptLower.includes('당기순이익') || conceptLower.includes('이익')) {
    return 'Income/Profit';
  }

  // Expense concepts
  if (conceptLower.includes('expense') || conceptLower.includes('cost') ||
      conceptLower.includes('비용') || conceptLower.includes('원가')) {
    return 'Expenses';
  }

  // Cash flow concepts
  if (conceptLower.includes('cash') || conceptLower.includes('현금')) {
    return 'Cash Flow';
  }

  return 'Other';
}

/**
 * Extract dimensional breakdowns from facts
 * @param {Array} facts - Array of XBRL facts
 * @returns {Object} Dimensional analysis
 */
export function extractDimensions(facts) {
  const geography = {};
  const segments = {};
  const products = {};

  facts.forEach(fact => {
    if (!fact.dimensions) return;

    // Geographic dimensions
    Object.keys(fact.dimensions).forEach(dimKey => {
      const dimValue = fact.dimensions[dimKey];

      if (dimKey.toLowerCase().includes('geography') || dimKey.toLowerCase().includes('region') ||
          dimKey.toLowerCase().includes('country') || dimKey.toLowerCase().includes('지역')) {
        if (!geography[dimValue]) {
          geography[dimValue] = [];
        }
        geography[dimValue].push(fact);
      }

      // Segment dimensions
      if (dimKey.toLowerCase().includes('segment') || dimKey.toLowerCase().includes('business') ||
          dimKey.toLowerCase().includes('부문')) {
        if (!segments[dimValue]) {
          segments[dimValue] = [];
        }
        segments[dimValue].push(fact);
      }

      // Product dimensions
      if (dimKey.toLowerCase().includes('product') || dimKey.toLowerCase().includes('제품')) {
        if (!products[dimValue]) {
          products[dimValue] = [];
        }
        products[dimValue].push(fact);
      }
    });
  });

  return {
    geography: Object.keys(geography).map(key => ({
      dimension: key,
      facts: geography[key].length,
      totalValue: geography[key].reduce((sum, f) => sum + (f.value || 0), 0)
    })),
    segments: Object.keys(segments).map(key => ({
      dimension: key,
      facts: segments[key].length,
      totalValue: segments[key].reduce((sum, f) => sum + (f.value || 0), 0)
    })),
    products: Object.keys(products).map(key => ({
      dimension: key,
      facts: products[key].length,
      totalValue: products[key].reduce((sum, f) => sum + (f.value || 0), 0)
    }))
  };
}

/**
 * Filter facts by criteria
 * @param {Array} facts - Array of XBRL facts
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered facts
 */
export function filterFacts(facts, criteria = {}) {
  const { concept, valueRange, period, hasValue, hasDimensions } = criteria;

  return facts.filter(fact => {
    if (concept && !fact.concept.toLowerCase().includes(concept.toLowerCase())) {
      return false;
    }

    if (hasValue && fact.value === null) {
      return false;
    }

    if (valueRange) {
      if (fact.value === null) return false;
      if (valueRange.min !== undefined && fact.value < valueRange.min) return false;
      if (valueRange.max !== undefined && fact.value > valueRange.max) return false;
    }

    if (period) {
      const factPeriod = fact.period?.endDate || fact.period?.instant || '';
      if (!factPeriod.includes(period)) return false;
    }

    if (hasDimensions && (!fact.dimensions || Object.keys(fact.dimensions).length === 0)) {
      return false;
    }

    return true;
  });
}

/**
 * Build summary statistics for facts
 * @param {Array} facts - Array of XBRL facts
 * @returns {Object} Summary statistics
 */
export function buildSummary(facts) {
  const numericFacts = facts.filter(f => f.value !== null);

  const byType = {};
  facts.forEach(fact => {
    const type = classifyFact(fact.concept);
    if (!byType[type]) {
      byType[type] = { count: 0, totalValue: 0 };
    }
    byType[type].count++;
    if (fact.value !== null) {
      byType[type].totalValue += fact.value;
    }
  });

  const byNamespace = {};
  facts.forEach(fact => {
    if (!byNamespace[fact.namespace]) {
      byNamespace[fact.namespace] = 0;
    }
    byNamespace[fact.namespace]++;
  });

  return {
    totalFacts: facts.length,
    numericFacts: numericFacts.length,
    textFacts: facts.length - numericFacts.length,
    byType,
    byNamespace,
    dimensions: extractDimensions(facts)
  };
}

export default {
  parseIXBRL,
  parseXBRLJSON,
  classifyFact,
  extractDimensions,
  filterFacts,
  buildSummary,
  parseFactValue
};
