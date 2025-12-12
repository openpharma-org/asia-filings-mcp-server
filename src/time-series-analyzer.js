import * as edinetApi from './edinet-api.js';
import * as dartApi from './dart-api.js';
import * as xbrlParser from './xbrl-parser.js';
import { formatCurrency, extractGeographyFromDimensions, extractSegmentFromDimensions } from './fact-table-builder.js';

/**
 * Perform time-series dimensional analysis across multiple periods
 * Adapted for Asian filings (Japan EDINET, Korea DART)
 * Supports J-GAAP and K-GAAP taxonomies
 *
 * @param {Object} params - Parameters
 * @param {string} params.country - Country code ('JP' or 'KR')
 * @param {string} params.companyId - EDINET code (JP) or corp code (KR)
 * @param {Object} params.options - Analysis options
 * @returns {Promise<Object>} Time-series analysis with growth rates and trends
 */
export async function timeSeriesAnalysis(params) {
  const {
    country,
    companyId,
    options = {}
  } = params;

  const defaultOptions = {
    concept: 'Revenue', // Concept to track (Revenue, Assets, NetIncome, etc.)
    periods: 4, // Number of periods to analyze
    includeGeography: true,
    includeSegments: true,
    showGrowthRates: true,
    minValue: 0,
    maxValue: Number.MAX_SAFE_INTEGER
  };

  const analysisOptions = { ...defaultOptions, ...options };
  const currencySymbol = country === 'JP' ? '¥' : '₩';

  try {
    const periodData = [];

    if (country === 'JP') {
      // Japan - EDINET: Get recent filings
      const filings = await edinetApi.getCompanyFilings(companyId, {
        limit: analysisOptions.periods * 2 // Get extra in case some fail
      });

      if (!filings.filings || filings.filings.length === 0) {
        throw new Error('No filings found for company');
      }

      // Extract facts from each period
      let processedCount = 0;
      for (let i = 0; i < filings.filings.length && processedCount < analysisOptions.periods; i++) {
        const filing = filings.filings[i];

        try {
          const xbrlData = await edinetApi.getFilingFacts(filing.document_id);

          // Search for the concept
          const searchCriteria = {
            concept: analysisOptions.concept,
            valueRange: {
              min: analysisOptions.minValue,
              max: analysisOptions.maxValue
            },
            hasValue: true
          };

          const facts = xbrlParser.filterFacts(xbrlData.facts, searchCriteria);

          if (facts.length > 0) {
            const enrichedFacts = facts.map(fact => ({
              ...fact,
              geography: extractGeographyFromDimensions(fact.dimensions) || 'Total',
              segment: extractSegmentFromDimensions(fact.dimensions) || 'Total'
            }));

            periodData.push({
              period: filing.period_end || filing.submit_date.substring(0, 10),
              document_id: filing.document_id,
              submit_date: filing.submit_date,
              country: 'JP',
              facts: enrichedFacts
            });

            processedCount++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          // Skip failed periods
          continue;
        }
      }

    } else if (country === 'KR') {
      // Korea - DART: Get financial statements for multiple years
      const currentYear = new Date().getFullYear();
      const reportCode = '11011'; // Annual reports

      for (let i = 0; i < analysisOptions.periods; i++) {
        const businessYear = (currentYear - i - 1).toString();

        try {
          const xbrlData = await dartApi.getFinancialStatements(companyId, businessYear, reportCode);

          // Search for the concept
          const searchCriteria = {
            concept: analysisOptions.concept,
            valueRange: {
              min: analysisOptions.minValue,
              max: analysisOptions.maxValue
            },
            hasValue: true
          };

          const facts = xbrlParser.filterFacts(xbrlData.facts, searchCriteria);

          if (facts.length > 0) {
            const enrichedFacts = facts.map(fact => ({
              ...fact,
              geography: extractGeographyFromDimensions(fact.dimensions) || 'Total',
              segment: extractSegmentFromDimensions(fact.dimensions) || 'Total'
            }));

            periodData.push({
              period: `${businessYear}-12-31`,
              business_year: businessYear,
              report_code: reportCode,
              country: 'KR',
              facts: enrichedFacts
            });
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          // Skip failed periods
          continue;
        }
      }

    } else {
      throw new Error('Unsupported country. Use JP for Japan or KR for Korea');
    }

    if (periodData.length === 0) {
      throw new Error(`No valid period data found for concept: ${analysisOptions.concept}`);
    }

    // Sort periods (newest first)
    periodData.sort((a, b) => b.period.localeCompare(a.period));

    // Build time series table
    const timeSeriesTable = buildTimeSeriesTable(periodData, analysisOptions, currencySymbol);

    // Calculate growth rates
    let growthAnalysis = null;
    if (analysisOptions.showGrowthRates && periodData.length >= 2) {
      growthAnalysis = calculateGrowthRates(timeSeriesTable, periodData, currencySymbol);
    }

    // Analyze geographic/segment mix
    let mixAnalysis = null;
    if (analysisOptions.includeGeography || analysisOptions.includeSegments) {
      mixAnalysis = analyzeMix(timeSeriesTable, analysisOptions, currencySymbol);
    }

    // Calculate trends
    const trends = calculateTrends(timeSeriesTable, currencySymbol);

    return {
      country,
      company: companyId,
      concept: analysisOptions.concept,
      periods: periodData.map(p => p.period).sort(),
      periodsAnalyzed: periodData.length,
      timeSeries: timeSeriesTable,
      growthAnalysis,
      mixAnalysis,
      trends,
      summary: {
        totalPeriods: periodData.length,
        totalDataPoints: timeSeriesTable.length,
        dateRange: {
          from: periodData[periodData.length - 1]?.period,
          to: periodData[0]?.period
        },
        uniqueGeographies: [...new Set(timeSeriesTable.map(t => t.geography))],
        uniqueSegments: [...new Set(timeSeriesTable.map(t => t.segment))]
      },
      source: country === 'JP' ? 'EDINET J-GAAP Time-Series Analysis' : 'DART K-GAAP Time-Series Analysis',
      taxonomy: country === 'JP' ? 'J-GAAP' : 'K-GAAP/IFRS'
    };

  } catch (error) {
    throw new Error(`Time-series analysis failed: ${error.message}`);
  }
}

/**
 * Build time series table from period data
 */
function buildTimeSeriesTable(periodData, options, currencySymbol) {
  const table = [];

  periodData.forEach(period => {
    period.facts.forEach(fact => {
      table.push({
        period: period.period,
        document_id: period.document_id || period.business_year,
        country: period.country,
        concept: fact.concept,
        accountName: fact.accountName || null,
        value: fact.value,
        valueFormatted: formatCurrency(fact.value, currencySymbol),
        geography: fact.geography,
        segment: fact.segment,
        periodType: fact.period?.instant ? 'instant' : 'duration',
        periodStart: fact.period?.startDate,
        periodEnd: fact.period?.endDate || fact.period?.instant,
        dimensions: fact.dimensions,
        dimensionCount: Object.keys(fact.dimensions || {}).length
      });
    });
  });

  // Sort by period (newest first), then by value
  table.sort((a, b) => {
    const periodCompare = b.period.localeCompare(a.period);
    if (periodCompare !== 0) return periodCompare;
    return b.value - a.value;
  });

  return table;
}

/**
 * Calculate period-over-period growth rates
 */
function calculateGrowthRates(timeSeries, periodData, currencySymbol) {
  const periods = periodData.map(p => p.period).sort();

  if (periods.length < 2) {
    return null;
  }

  const growthRates = [];

  for (let i = 0; i < periods.length - 1; i++) {
    const currentPeriod = periods[i];
    const priorPeriod = periods[i + 1];

    const currentData = timeSeries.filter(t => t.period === currentPeriod);
    const priorData = timeSeries.filter(t => t.period === priorPeriod);

    // Calculate growth by geography
    const geographies = [...new Set([
      ...currentData.map(d => d.geography),
      ...priorData.map(d => d.geography)
    ])];

    geographies.forEach(geo => {
      const currentValue = currentData
        .filter(d => d.geography === geo)
        .reduce((sum, d) => sum + d.value, 0);

      const priorValue = priorData
        .filter(d => d.geography === geo)
        .reduce((sum, d) => sum + d.value, 0);

      if (priorValue > 0) {
        const growthRate = ((currentValue - priorValue) / priorValue) * 100;
        const absoluteChange = currentValue - priorValue;

        growthRates.push({
          from: priorPeriod,
          to: currentPeriod,
          geography: geo,
          priorValue,
          currentValue,
          priorValueFormatted: formatCurrency(priorValue, currencySymbol),
          currentValueFormatted: formatCurrency(currentValue, currencySymbol),
          absoluteChange,
          absoluteChangeFormatted: formatCurrency(absoluteChange, currencySymbol),
          growthRate: parseFloat(growthRate.toFixed(2)),
          growthFormatted: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`
        });
      }
    });
  }

  // Sort by growth rate (highest first)
  growthRates.sort((a, b) => Math.abs(b.growthRate) - Math.abs(a.growthRate));

  return {
    rates: growthRates,
    summary: {
      totalComparisons: growthRates.length,
      averageGrowthRate: growthRates.length > 0
        ? (growthRates.reduce((sum, r) => sum + r.growthRate, 0) / growthRates.length).toFixed(2) + '%'
        : 'N/A',
      highestGrowth: growthRates[0] || null,
      lowestGrowth: growthRates[growthRates.length - 1] || null
    }
  };
}

/**
 * Analyze geographic and segment mix by period
 */
function analyzeMix(timeSeries, options, currencySymbol) {
  const periods = [...new Set(timeSeries.map(t => t.period))].sort();

  const mixByPeriod = {};

  periods.forEach(period => {
    const periodData = timeSeries.filter(t => t.period === period);
    const total = periodData.reduce((sum, d) => sum + d.value, 0);

    const periodMix = {
      total,
      totalFormatted: formatCurrency(total, currencySymbol)
    };

    // Geographic mix
    if (options.includeGeography) {
      const geographicMix = {};
      const geographies = [...new Set(periodData.map(d => d.geography))];

      geographies.forEach(geo => {
        const geoValue = periodData
          .filter(d => d.geography === geo)
          .reduce((sum, d) => sum + d.value, 0);

        geographicMix[geo] = {
          value: geoValue,
          valueFormatted: formatCurrency(geoValue, currencySymbol),
          percentage: total > 0 ? (geoValue / total) * 100 : 0,
          percentageFormatted: total > 0 ? `${((geoValue / total) * 100).toFixed(1)}%` : 'N/A'
        };
      });

      periodMix.geographic = geographicMix;
    }

    // Segment mix
    if (options.includeSegments) {
      const segmentMix = {};
      const segments = [...new Set(periodData.map(d => d.segment))];

      segments.forEach(seg => {
        const segValue = periodData
          .filter(d => d.segment === seg)
          .reduce((sum, d) => sum + d.value, 0);

        segmentMix[seg] = {
          value: segValue,
          valueFormatted: formatCurrency(segValue, currencySymbol),
          percentage: total > 0 ? (segValue / total) * 100 : 0,
          percentageFormatted: total > 0 ? `${((segValue / total) * 100).toFixed(1)}%` : 'N/A'
        };
      });

      periodMix.segment = segmentMix;
    }

    mixByPeriod[period] = periodMix;
  });

  return mixByPeriod;
}

/**
 * Calculate overall trends
 */
function calculateTrends(timeSeries, currencySymbol) {
  const periods = [...new Set(timeSeries.map(t => t.period))].sort();

  if (periods.length < 2) {
    return {
      direction: 'insufficient_data',
      message: 'Need at least 2 periods to calculate trends'
    };
  }

  // Calculate total value per period
  const periodTotals = periods.map(period => {
    const periodData = timeSeries.filter(t => t.period === period);
    return {
      period,
      total: periodData.reduce((sum, d) => sum + d.value, 0)
    };
  });

  // Determine trend direction
  const firstTotal = periodTotals[periodTotals.length - 1].total;
  const lastTotal = periodTotals[0].total;
  const overallChange = lastTotal - firstTotal;
  const overallChangePercent = firstTotal > 0 ? ((overallChange / firstTotal) * 100) : 0;

  let direction = 'stable';
  if (overallChangePercent > 5) {
    direction = 'increasing';
  } else if (overallChangePercent < -5) {
    direction = 'decreasing';
  }

  return {
    direction,
    overallChange,
    overallChangeFormatted: formatCurrency(overallChange, currencySymbol),
    overallChangePercent: overallChangePercent.toFixed(2) + '%',
    periodTotals: periodTotals.map(pt => ({
      period: pt.period,
      total: pt.total,
      totalFormatted: formatCurrency(pt.total, currencySymbol)
    })),
    firstPeriod: {
      period: periodTotals[periodTotals.length - 1].period,
      value: firstTotal,
      valueFormatted: formatCurrency(firstTotal, currencySymbol)
    },
    lastPeriod: {
      period: periodTotals[0].period,
      value: lastTotal,
      valueFormatted: formatCurrency(lastTotal, currencySymbol)
    }
  };
}

export default {
  timeSeriesAnalysis,
  buildTimeSeriesTable,
  calculateGrowthRates,
  analyzeMix,
  calculateTrends
};
