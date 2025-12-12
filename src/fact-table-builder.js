import axios from 'axios';
import * as xbrlParser from './xbrl-parser.js';
import * as edinetApi from './edinet-api.js';
import * as dartApi from './dart-api.js';

/**
 * Build comprehensive fact table around target value
 * Adapted for Asian filings (Japan EDINET, Korea DART)
 * Supports J-GAAP and K-GAAP taxonomies
 *
 * @param {Object} params - Parameters
 * @param {string} params.country - Country code ('JP' or 'KR')
 * @param {string} params.companyId - EDINET code (JP) or corp code (KR)
 * @param {number} params.targetValue - Target value in currency units
 * @param {number} params.tolerance - Tolerance range (±)
 * @param {string} params.documentId - Optional specific document/filing ID
 * @param {Object} params.options - Table options
 * @returns {Promise<Object>} Fact table with business intelligence
 */
export async function buildFactTable(params) {
  const {
    country,
    companyId,
    targetValue,
    tolerance = 50000000,
    documentId = null,
    options = {}
  } = params;

  const defaultOptions = {
    maxRows: 25,
    showDimensions: true,
    sortBy: 'deviation', // 'deviation', 'value', 'concept'
    filters: {}
  };

  const tableOptions = { ...defaultOptions, ...options };

  try {
    let xbrlData;
    let filingInfo = {};
    let currencySymbol = country === 'JP' ? '¥' : '₩';

    // 1. Get XBRL data based on country
    if (country === 'JP') {
      // Japan - EDINET
      let targetDocId = documentId;

      if (!targetDocId) {
        // Get recent filing to find document ID
        const filings = await edinetApi.getCompanyFilings(companyId, { limit: 1 });
        if (!filings.filings || filings.filings.length === 0) {
          throw new Error('No filings found for company');
        }
        targetDocId = filings.filings[0].document_id;
        filingInfo = filings.filings[0];
      }

      xbrlData = await edinetApi.getFilingFacts(targetDocId);
      filingInfo.document_id = targetDocId;

    } else if (country === 'KR') {
      // Korea - DART
      if (!documentId) {
        throw new Error('business_year and report_code are required for Korean filings');
      }

      // documentId should be formatted as "businessYear:reportCode"
      const [businessYear, reportCode] = documentId.split(':');
      xbrlData = await dartApi.getFinancialStatements(companyId, businessYear, reportCode || '11011');
      filingInfo.business_year = businessYear;
      filingInfo.report_code = reportCode;

    } else {
      throw new Error('Unsupported country. Use JP for Japan or KR for Korea');
    }

    // 2. Find facts in value range
    const searchCriteria = {
      valueRange: {
        min: targetValue - tolerance,
        max: targetValue + tolerance
      },
      hasValue: true,
      ...tableOptions.filters
    };

    const matchingFacts = xbrlParser.filterFacts(xbrlData.facts, searchCriteria);

    if (matchingFacts.length === 0) {
      return {
        country,
        company: companyId,
        filing_info: filingInfo,
        targetValue,
        tolerance,
        searchRange: {
          min: targetValue - tolerance,
          max: targetValue + tolerance,
          minFormatted: formatCurrency(targetValue - tolerance, currencySymbol),
          maxFormatted: formatCurrency(targetValue + tolerance, currencySymbol)
        },
        table: [],
        summary: {
          totalFacts: 0,
          message: 'No facts found in the specified value range'
        }
      };
    }

    // 3. Enrich facts with business intelligence
    const enrichedFacts = matchingFacts.map((fact, index) => {
      const deviation = fact.value - targetValue;
      const exactMatch = Math.abs(deviation) < 1000;

      return {
        rowNumber: index + 1,
        concept: fact.concept,
        accountName: fact.accountName || null, // Korean-specific
        namespace: fact.namespace || 'unknown',
        value: fact.value,
        valueFormatted: formatCurrency(fact.value, currencySymbol),
        exactMatch,
        deviationFromTarget: deviation,
        deviationFormatted: `${deviation >= 0 ? '+' : ''}${formatCurrency(deviation, currencySymbol)}`,
        deviationPercent: targetValue !== 0 ? ((deviation / targetValue) * 100).toFixed(2) + '%' : 'N/A',

        periodType: fact.period?.instant ? 'instant' : 'duration',
        periodStart: fact.period?.startDate,
        periodEnd: fact.period?.endDate || fact.period?.instant,

        dimensions: fact.dimensions || {},
        dimensionCount: Object.keys(fact.dimensions || {}).length,

        geography: extractGeographyFromDimensions(fact.dimensions),
        segment: extractSegmentFromDimensions(fact.dimensions),
        product: extractProductFromDimensions(fact.dimensions),

        hasGeographicDimension: hasGeographyDimension(fact.dimensions),
        hasSegmentDimension: hasSegmentDimension(fact.dimensions),
        hasProductDimension: hasProductDimension(fact.dimensions),

        businessClassification: xbrlParser.classifyFact(fact.concept, country === 'JP' ? 'J-GAAP' : 'K-GAAP'),

        contextRef: fact.contextRef,
        unitRef: fact.unitRef || fact.unit,
        decimals: fact.decimals,
        scale: fact.scale
      };
    });

    // 4. Sort based on options
    sortFacts(enrichedFacts, tableOptions.sortBy);

    // 5. Limit results
    const limitedFacts = enrichedFacts.slice(0, tableOptions.maxRows);

    // 6. Generate business intelligence summary
    const summary = generateFactTableSummary(enrichedFacts, targetValue, tolerance, currencySymbol);

    return {
      country,
      company: companyId,
      filing_info: filingInfo,
      targetValue,
      tolerance,
      searchRange: {
        min: targetValue - tolerance,
        max: targetValue + tolerance,
        minFormatted: formatCurrency(targetValue - tolerance, currencySymbol),
        maxFormatted: formatCurrency(targetValue + tolerance, currencySymbol)
      },
      table: limitedFacts,
      summary,
      totalFactsFound: enrichedFacts.length,
      totalFactsReturned: limitedFacts.length,
      source: country === 'JP' ? 'EDINET J-GAAP Analysis' : 'DART K-GAAP Analysis',
      taxonomy: country === 'JP' ? 'J-GAAP' : 'K-GAAP/IFRS'
    };

  } catch (error) {
    throw new Error(`Failed to build fact table: ${error.message}`);
  }
}

/**
 * Generate comprehensive summary statistics
 */
function generateFactTableSummary(facts, targetValue, tolerance, currencySymbol) {
  if (!facts || facts.length === 0) {
    return {
      totalFacts: 0,
      exactMatches: 0,
      message: 'No facts found'
    };
  }

  const values = facts.map(f => f.value);

  return {
    totalFacts: facts.length,
    exactMatches: facts.filter(f => f.exactMatch).length,

    conceptTypes: [...new Set(facts.map(f => f.concept))],
    uniqueConcepts: [...new Set(facts.map(f => f.concept))].length,

    factsWithGeography: facts.filter(f => f.hasGeographicDimension).length,
    factsWithSegments: facts.filter(f => f.hasSegmentDimension).length,
    factsWithProducts: facts.filter(f => f.hasProductDimension).length,
    factsWithDimensions: facts.filter(f => f.dimensionCount > 0).length,

    valueRange: {
      min: Math.min(...values),
      max: Math.max(...values),
      minFormatted: formatCurrency(Math.min(...values), currencySymbol),
      maxFormatted: formatCurrency(Math.max(...values), currencySymbol),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      averageFormatted: formatCurrency(values.reduce((a, b) => a + b, 0) / values.length, currencySymbol)
    },

    businessTypes: facts.reduce((acc, fact) => {
      const type = fact.businessClassification;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),

    periodTypes: [...new Set(facts.map(f => f.periodType))],

    geographicBreakdown: getGeographicBreakdown(facts, currencySymbol),
    segmentBreakdown: getSegmentBreakdown(facts, currencySymbol),

    closestMatch: facts.reduce((closest, fact) => {
      return Math.abs(fact.deviationFromTarget) < Math.abs(closest.deviationFromTarget)
        ? fact
        : closest;
    }, facts[0])
  };
}

/**
 * Get geographic breakdown summary
 */
function getGeographicBreakdown(facts, currencySymbol) {
  const breakdown = {};

  facts.forEach(fact => {
    if (fact.geography) {
      if (!breakdown[fact.geography]) {
        breakdown[fact.geography] = {
          count: 0,
          totalValue: 0,
          avgValue: 0
        };
      }
      breakdown[fact.geography].count++;
      breakdown[fact.geography].totalValue += fact.value;
    }
  });

  // Calculate averages
  Object.keys(breakdown).forEach(geo => {
    breakdown[geo].avgValue = breakdown[geo].totalValue / breakdown[geo].count;
    breakdown[geo].totalValueFormatted = formatCurrency(breakdown[geo].totalValue, currencySymbol);
    breakdown[geo].avgValueFormatted = formatCurrency(breakdown[geo].avgValue, currencySymbol);
  });

  return breakdown;
}

/**
 * Get segment breakdown summary
 */
function getSegmentBreakdown(facts, currencySymbol) {
  const breakdown = {};

  facts.forEach(fact => {
    if (fact.segment) {
      if (!breakdown[fact.segment]) {
        breakdown[fact.segment] = {
          count: 0,
          totalValue: 0,
          avgValue: 0
        };
      }
      breakdown[fact.segment].count++;
      breakdown[fact.segment].totalValue += fact.value;
    }
  });

  // Calculate averages
  Object.keys(breakdown).forEach(seg => {
    breakdown[seg].avgValue = breakdown[seg].totalValue / breakdown[seg].count;
    breakdown[seg].totalValueFormatted = formatCurrency(breakdown[seg].totalValue, currencySymbol);
    breakdown[seg].avgValueFormatted = formatCurrency(breakdown[seg].avgValue, currencySymbol);
  });

  return breakdown;
}

/**
 * Sort facts based on criteria
 */
function sortFacts(facts, sortBy) {
  if (sortBy === 'deviation') {
    facts.sort((a, b) => Math.abs(a.deviationFromTarget) - Math.abs(b.deviationFromTarget));
  } else if (sortBy === 'value') {
    facts.sort((a, b) => b.value - a.value);
  } else if (sortBy === 'concept') {
    facts.sort((a, b) => a.concept.localeCompare(b.concept));
  }
}

/**
 * Format currency value with appropriate unit
 * Supports Japanese Yen (¥) and Korean Won (₩)
 */
export function formatCurrency(value, symbol = '¥') {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000000000000) {
    return `${sign}${symbol}${(absValue / 1000000000000).toFixed(2)}T`;
  } else if (absValue >= 1000000000) {
    return `${sign}${symbol}${(absValue / 1000000000).toFixed(2)}B`;
  } else if (absValue >= 1000000) {
    return `${sign}${symbol}${(absValue / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `${sign}${symbol}${(absValue / 1000).toFixed(1)}K`;
  } else {
    return `${sign}${symbol}${absValue.toFixed(0)}`;
  }
}

/**
 * Extract geography from dimensions
 */
export function extractGeographyFromDimensions(dimensions) {
  if (!dimensions) return null;

  const geoKeys = [
    // IFRS/ESEF common keys
    'GeographicalAreasMember',
    'CountriesMember',
    'RegionsMember',
    'StatementGeographicalAxis',
    // Japanese J-GAAP keys
    'GeographicArea',
    '地域',
    'Region',
    // Korean K-GAAP keys
    '지역',
    'Area'
  ];

  for (const key of Object.keys(dimensions)) {
    if (geoKeys.some(geoKey => key.includes(geoKey))) {
      return cleanDimensionValue(dimensions[key]);
    }
  }

  return null;
}

/**
 * Extract segment from dimensions
 */
export function extractSegmentFromDimensions(dimensions) {
  if (!dimensions) return null;

  const segmentKeys = [
    // IFRS/ESEF common keys
    'SegmentsMember',
    'BusinessSegmentsMember',
    'OperatingSegmentsMember',
    'StatementBusinessSegmentsAxis',
    // Japanese J-GAAP keys
    'Segment',
    'セグメント',
    'BusinessSegment',
    // Korean K-GAAP keys
    '사업부문',
    '부문'
  ];

  for (const key of Object.keys(dimensions)) {
    if (segmentKeys.some(segKey => key.includes(segKey))) {
      return cleanDimensionValue(dimensions[key]);
    }
  }

  return null;
}

/**
 * Extract product from dimensions
 */
export function extractProductFromDimensions(dimensions) {
  if (!dimensions) return null;

  const productKeys = [
    // IFRS/ESEF common keys
    'ProductsAndServicesMember',
    'ProductMember',
    'SubsegmentsAxis',
    // Japanese J-GAAP keys
    'Product',
    '製品',
    '商品',
    // Korean K-GAAP keys
    '제품',
    '상품'
  ];

  for (const key of Object.keys(dimensions)) {
    if (productKeys.some(prodKey => key.includes(prodKey))) {
      return cleanDimensionValue(dimensions[key]);
    }
  }

  return null;
}

/**
 * Check if dimensions include geography
 */
function hasGeographyDimension(dimensions) {
  return extractGeographyFromDimensions(dimensions) !== null;
}

/**
 * Check if dimensions include segment
 */
function hasSegmentDimension(dimensions) {
  return extractSegmentFromDimensions(dimensions) !== null;
}

/**
 * Check if dimensions include product
 */
function hasProductDimension(dimensions) {
  return extractProductFromDimensions(dimensions) !== null;
}

/**
 * Clean dimension value (remove namespace and 'Member' suffix)
 */
function cleanDimensionValue(value) {
  if (!value || typeof value !== 'string') return value;

  return value
    .split(':').pop() // Remove namespace
    .replace(/Member$/, '') // Remove 'Member' suffix
    .replace(/([A-Z])/g, ' $1') // Add spaces before capitals
    .trim();
}

export default {
  buildFactTable,
  generateFactTableSummary,
  sortFacts,
  formatCurrency,
  extractGeographyFromDimensions,
  extractSegmentFromDimensions,
  extractProductFromDimensions
};
