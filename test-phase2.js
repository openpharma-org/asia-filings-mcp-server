#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Asia Filings MCP Server (Phase 2)
 * Tests all XBRL parsing, dimensional analysis, and advanced features
 */

import * as xbrlParser from './src/xbrl-parser.js';
import * as factTableBuilder from './src/fact-table-builder.js';
import * as timeSeriesAnalyzer from './src/time-series-analyzer.js';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper functions
function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS', error: null });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(`${message}: value is null or undefined`);
  }
}

function assertGreaterThan(actual, expected, message) {
  if (actual <= expected) {
    throw new Error(`${message}: expected > ${expected}, got ${actual}`);
  }
}

function assertArrayLength(array, expectedLength, message) {
  if (!Array.isArray(array)) {
    throw new Error(`${message}: not an array`);
  }
  if (array.length !== expectedLength) {
    throw new Error(`${message}: expected length ${expectedLength}, got ${array.length}`);
  }
}

console.log('\n🧪 ASIA FILINGS MCP SERVER - COMPREHENSIVE TEST SUITE\n');
console.log('=' .repeat(70));

// ============================================================================
// SECTION 1: XBRL Parser Tests
// ============================================================================

console.log('\n📊 SECTION 1: XBRL Parser Tests\n');

test('parseFactValue - handles positive numbers', () => {
  const result = xbrlParser.parseFactValue('1000000');
  assertEquals(result, 1000000, 'Positive number parsing');
});

test('parseFactValue - handles negative numbers with Japanese symbols', () => {
  const result = xbrlParser.parseFactValue('△500000');
  assertEquals(result, -500000, 'Japanese negative symbol');
});

test('parseFactValue - handles Korean negative symbols', () => {
  const result = xbrlParser.parseFactValue('▲250000');
  assertEquals(result, -250000, 'Korean negative symbol');
});

test('parseFactValue - handles comma-separated numbers', () => {
  const result = xbrlParser.parseFactValue('1,000,000');
  assertEquals(result, 1000000, 'Comma-separated numbers');
});

test('parseFactValue - handles full-width spaces', () => {
  const result = xbrlParser.parseFactValue('　1000000');
  assertEquals(result, 1000000, 'Full-width space handling');
});

// ============================================================================
// SECTION 2: Fact Classification Tests
// ============================================================================

console.log('\n🏷️  SECTION 2: Fact Classification Tests\n');

test('classifyFact - Revenue (English)', () => {
  const result = xbrlParser.classifyFact('NetRevenue');
  assertEquals(result, 'Revenue', 'English revenue classification');
});

test('classifyFact - Revenue (Japanese)', () => {
  const result = xbrlParser.classifyFact('売上高');
  assertEquals(result, 'Revenue', 'Japanese revenue classification');
});

test('classifyFact - Revenue (Korean)', () => {
  const result = xbrlParser.classifyFact('매출액');
  assertEquals(result, 'Revenue', 'Korean revenue classification');
});

test('classifyFact - Current Assets', () => {
  const result = xbrlParser.classifyFact('CurrentAssets');
  assertEquals(result, 'Current Assets', 'Current assets classification');
});

test('classifyFact - Current Assets (Japanese)', () => {
  const result = xbrlParser.classifyFact('流動資産');
  assertEquals(result, 'Current Assets', 'Japanese current assets');
});

test('classifyFact - Current Assets (Korean)', () => {
  const result = xbrlParser.classifyFact('유동자산');
  assertEquals(result, 'Current Assets', 'Korean current assets');
});

test('classifyFact - Total Liabilities', () => {
  const result = xbrlParser.classifyFact('TotalLiabilities');
  assertEquals(result, 'Total Liabilities', 'Total liabilities classification');
});

test('classifyFact - Operating Income', () => {
  const result = xbrlParser.classifyFact('OperatingIncome');
  assertEquals(result, 'Operating Income', 'Operating income classification');
});

test('classifyFact - Operating Income (Japanese)', () => {
  const result = xbrlParser.classifyFact('営業利益');
  assertEquals(result, 'Operating Income', 'Japanese operating income');
});

test('classifyFact - Cost of Sales (Korean)', () => {
  const result = xbrlParser.classifyFact('매출원가');
  assertEquals(result, 'Cost of Sales', 'Korean cost of sales');
});

test('classifyFact - Cash Flow Operating', () => {
  const result = xbrlParser.classifyFact('CashFlowFromOperatingActivities');
  assertEquals(result, 'Cash Flow - Operating', 'Operating cash flow');
});

test('classifyFact - Inventory', () => {
  const result = xbrlParser.classifyFact('Inventories');
  assertEquals(result, 'Inventory', 'Inventory classification');
});

test('classifyFact - Receivables (Japanese)', () => {
  const result = xbrlParser.classifyFact('売掛金');
  assertEquals(result, 'Receivables', 'Japanese receivables');
});

test('classifyFact - Depreciation', () => {
  const result = xbrlParser.classifyFact('DepreciationAndAmortization');
  assertEquals(result, 'Depreciation/Amortization', 'Depreciation classification');
});

// ============================================================================
// SECTION 3: Dimensional Extraction Tests
// ============================================================================

console.log('\n🌍 SECTION 3: Dimensional Extraction Tests\n');

test('extractGeographyFromDimensions - IFRS format', () => {
  const dimensions = { 'ifrs-full:GeographicalAreasMember': 'Japan' };
  const result = xbrlParser.extractGeographyFromDimensions(dimensions);
  assertEquals(result, 'Japan', 'IFRS geography extraction');
});

test('extractGeographyFromDimensions - Japanese format', () => {
  const dimensions = { '地域': 'アジア' };
  const result = xbrlParser.extractGeographyFromDimensions(dimensions);
  assertNotNull(result, 'Japanese geography extraction');
});

test('extractGeographyFromDimensions - Korean format', () => {
  const dimensions = { '지역': '아시아' };
  const result = xbrlParser.extractGeographyFromDimensions(dimensions);
  assertNotNull(result, 'Korean geography extraction');
});

test('extractSegmentFromDimensions - IFRS format', () => {
  const dimensions = { 'ifrs-full:SegmentsMember': 'Electronics' };
  const result = xbrlParser.extractSegmentFromDimensions(dimensions);
  assertEquals(result, 'Electronics', 'IFRS segment extraction');
});

test('extractSegmentFromDimensions - Japanese format', () => {
  const dimensions = { 'セグメント': '電子機器' };
  const result = xbrlParser.extractSegmentFromDimensions(dimensions);
  assertNotNull(result, 'Japanese segment extraction');
});

test('extractSegmentFromDimensions - Korean format', () => {
  const dimensions = { '사업부문': '전자' };
  const result = xbrlParser.extractSegmentFromDimensions(dimensions);
  assertNotNull(result, 'Korean segment extraction');
});

test('extractProductFromDimensions - IFRS format', () => {
  const dimensions = { 'ifrs-full:ProductsAndServicesMember': 'Smartphones' };
  const result = xbrlParser.extractProductFromDimensions(dimensions);
  assertEquals(result, 'Smartphones', 'IFRS product extraction');
});

test('extractProductFromDimensions - Japanese format', () => {
  const dimensions = { '製品': 'スマートフォン' };
  const result = xbrlParser.extractProductFromDimensions(dimensions);
  assertNotNull(result, 'Japanese product extraction');
});

test('extractProductFromDimensions - Korean format', () => {
  const dimensions = { '제품': '스마트폰' };
  const result = xbrlParser.extractProductFromDimensions(dimensions);
  assertNotNull(result, 'Korean product extraction');
});

test('extractDimensions - processes multiple facts', () => {
  const facts = [
    {
      concept: 'Revenue',
      value: 1000000,
      dimensions: { 'GeographicalAreasMember': 'Japan' }
    },
    {
      concept: 'Revenue',
      value: 500000,
      dimensions: { 'SegmentsMember': 'Electronics' }
    }
  ];
  const result = xbrlParser.extractDimensions(facts);
  assertNotNull(result.geography, 'Geography extraction from facts');
  assertNotNull(result.segments, 'Segments extraction from facts');
});

// ============================================================================
// SECTION 4: Fact Table Builder Tests
// ============================================================================

console.log('\n📋 SECTION 4: Fact Table Builder Tests\n');

test('formatCurrency - handles Japanese Yen', () => {
  const result = factTableBuilder.formatCurrency(1000000000, '¥');
  assertEquals(result, '¥1.00B', 'Japanese Yen formatting');
});

test('formatCurrency - handles Korean Won', () => {
  const result = factTableBuilder.formatCurrency(1000000000, '₩');
  assertEquals(result, '₩1.00B', 'Korean Won formatting');
});

test('formatCurrency - handles millions', () => {
  const result = factTableBuilder.formatCurrency(50000000, '¥');
  assertEquals(result, '¥50.0M', 'Million formatting');
});

test('formatCurrency - handles thousands', () => {
  const result = factTableBuilder.formatCurrency(50000, '¥');
  assertEquals(result, '¥50.0K', 'Thousand formatting');
});

test('formatCurrency - handles negative values', () => {
  const result = factTableBuilder.formatCurrency(-1000000, '¥');
  assertEquals(result, '-¥1.0M', 'Negative value formatting');
});

test('formatCurrency - handles trillions', () => {
  const result = factTableBuilder.formatCurrency(5000000000000, '₩');
  assertEquals(result, '₩5.00T', 'Trillion formatting');
});

// ============================================================================
// SECTION 5: Integration Tests (Mock Data)
// ============================================================================

console.log('\n🔗 SECTION 5: Integration Tests (Mock Data)\n');

test('parseXBRLJSON - processes Korean DART format', () => {
  const mockData = {
    list: [
      {
        account_nm: '매출액',
        account_id: 'Revenue',
        thstrm_amount: '1,000,000',
        frmtrm_amount: '900,000',
        bsns_year: '2023',
        reprt_code: '11011'
      }
    ]
  };
  const result = xbrlParser.parseXBRLJSON(mockData);
  assertNotNull(result.facts, 'XBRL-JSON parsing returns facts');
  assertGreaterThan(result.facts.length, 0, 'Facts array not empty');
  assertEquals(result.facts[0].value, 1000000, 'Fact value parsed correctly');
});

test('buildSummary - generates comprehensive statistics', () => {
  const facts = [
    {
      namespace: 'test',
      concept: 'Revenue',
      value: 1000000,
      dimensions: { geo: 'Japan' }
    },
    {
      namespace: 'test',
      concept: 'Assets',
      value: 5000000,
      dimensions: {}
    }
  ];
  const result = xbrlParser.buildSummary(facts);
  assertEquals(result.totalFacts, 2, 'Total facts count');
  assertEquals(result.numericFacts, 2, 'Numeric facts count');
  assertNotNull(result.byType, 'Business type breakdown exists');
  assertNotNull(result.dimensions, 'Dimensions analysis exists');
});

test('filterFacts - filters by concept', () => {
  const facts = [
    { concept: 'Revenue', value: 1000000 },
    { concept: 'Assets', value: 5000000 },
    { concept: 'RevenueFromProducts', value: 800000 }
  ];
  const result = xbrlParser.filterFacts(facts, { concept: 'Revenue' });
  assertEquals(result.length, 2, 'Filtered by concept');
});

test('filterFacts - filters by value range', () => {
  const facts = [
    { concept: 'Revenue', value: 1000000 },
    { concept: 'Assets', value: 5000000 },
    { concept: 'Cash', value: 500000 }
  ];
  const result = xbrlParser.filterFacts(facts, {
    valueRange: { min: 800000, max: 2000000 }
  });
  assertEquals(result.length, 1, 'Filtered by value range');
});

test('filterFacts - filters by hasDimensions', () => {
  const facts = [
    { concept: 'Revenue', value: 1000000, dimensions: { geo: 'Japan' } },
    { concept: 'Assets', value: 5000000, dimensions: {} }
  ];
  const result = xbrlParser.filterFacts(facts, { hasDimensions: true });
  assertEquals(result.length, 1, 'Filtered by has dimensions');
});

// ============================================================================
// SECTION 6: Error Handling Tests
// ============================================================================

console.log('\n⚠️  SECTION 6: Error Handling Tests\n');

test('parseFactValue - handles null', () => {
  const result = xbrlParser.parseFactValue(null);
  assertEquals(result, null, 'Null input handling');
});

test('parseFactValue - handles empty string', () => {
  const result = xbrlParser.parseFactValue('');
  assertEquals(result, null, 'Empty string handling');
});

test('parseFactValue - handles non-numeric text', () => {
  const result = xbrlParser.parseFactValue('not a number');
  assertEquals(result, null, 'Non-numeric text handling');
});

test('extractGeographyFromDimensions - handles null dimensions', () => {
  const result = xbrlParser.extractGeographyFromDimensions(null);
  assertEquals(result, null, 'Null dimensions handling');
});

test('extractGeographyFromDimensions - handles empty dimensions', () => {
  const result = xbrlParser.extractGeographyFromDimensions({});
  assertEquals(result, null, 'Empty dimensions handling');
});

test('formatCurrency - handles null', () => {
  const result = factTableBuilder.formatCurrency(null, '¥');
  assertEquals(result, 'N/A', 'Null currency formatting');
});

test('formatCurrency - handles NaN', () => {
  const result = factTableBuilder.formatCurrency(NaN, '¥');
  assertEquals(result, 'N/A', 'NaN currency formatting');
});

test('classifyFact - handles unknown concepts', () => {
  const result = xbrlParser.classifyFact('UnknownConcept');
  assertEquals(result, 'Other', 'Unknown concept classification');
});

// ============================================================================
// SECTION 7: Multi-Language Support Tests
// ============================================================================

console.log('\n🌐 SECTION 7: Multi-Language Support Tests\n');

test('Multi-language - Japanese revenue concepts', () => {
  const concepts = ['売上高', '営業収益', '収益'];
  concepts.forEach(concept => {
    const result = xbrlParser.classifyFact(concept);
    assertEquals(result, 'Revenue', `Japanese concept: ${concept}`);
  });
});

test('Multi-language - Korean asset concepts', () => {
  const concepts = ['자산', '유동자산', '비유동자산'];
  concepts.forEach(concept => {
    const result = xbrlParser.classifyFact(concept);
    if (concept.includes('유동')) {
      assertEquals(result, 'Current Assets', `Korean concept: ${concept}`);
    } else if (concept.includes('비유동')) {
      assertEquals(result, 'Non-current Assets', `Korean concept: ${concept}`);
    } else {
      assertEquals(result, 'Assets', `Korean concept: ${concept}`);
    }
  });
});

test('Multi-language - Japanese liability concepts', () => {
  const concepts = ['負債', '流動負債', '固定負債'];
  concepts.forEach(concept => {
    const result = xbrlParser.classifyFact(concept);
    if (concept.includes('流動')) {
      assertEquals(result, 'Current Liabilities', `Japanese concept: ${concept}`);
    } else if (concept.includes('固定')) {
      assertEquals(result, 'Non-current Liabilities', `Japanese concept: ${concept}`);
    } else {
      assertEquals(result, 'Liabilities', `Japanese concept: ${concept}`);
    }
  });
});

test('Multi-language - Korean expense concepts', () => {
  const concepts = ['비용', '원가', '매출원가', '영업비용'];
  concepts.forEach(concept => {
    const result = xbrlParser.classifyFact(concept);
    if (concept.includes('매출원가')) {
      assertEquals(result, 'Cost of Sales', `Korean concept: ${concept}`);
    } else if (concept.includes('영업')) {
      assertEquals(result, 'Operating Expenses', `Korean concept: ${concept}`);
    } else {
      assertEquals(result, 'Expenses', `Korean concept: ${concept}`);
    }
  });
});

// ============================================================================
// Test Summary
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('\n📊 TEST SUMMARY\n');
console.log(`Total Tests: ${results.passed + results.failed}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed > 0) {
  console.log('\n❌ FAILED TESTS:\n');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  • ${t.name}`);
    console.log(`    ${t.error}`);
  });
}

console.log('\n' + '='.repeat(70));

if (results.failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Phase 2 implementation is fully functional.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${results.failed} test(s) failed. Please review and fix.\n`);
  process.exit(1);
}
