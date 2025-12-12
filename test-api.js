#!/usr/bin/env node

/**
 * Basic API tests for Asia Filings MCP Server
 *
 * NOTE: These tests require API keys to be set as environment variables:
 * - EDINET_API_KEY
 * - DART_API_KEY
 */

import * as edinet from './src/edinet-api.js';
import * as dart from './src/dart-api.js';

console.log('='.repeat(80));
console.log('  ASIA FILINGS MCP SERVER - API TESTS');
console.log('='.repeat(80));
console.log();

async function testAPIs() {
  let passedTests = 0;
  let totalTests = 0;

  // Check API keys
  const edinetKey = process.env.EDINET_API_KEY;
  const dartKey = process.env.DART_API_KEY;

  if (!edinetKey) {
    console.log('⚠️  EDINET_API_KEY not set. Skipping Japan tests.');
  }
  if (!dartKey) {
    console.log('⚠️  DART_API_KEY not set. Skipping Korea tests.');
  }
  console.log();

  // ============= JAPAN EDINET TESTS =============
  if (edinetKey) {
    console.log('📊 Testing Japan EDINET API');
    console.log('-'.repeat(80));

    // Test 1: Get documents by date
    totalTests++;
    try {
      console.log('Test 1: Get documents by date...');
      const today = new Date().toISOString().split('T')[0];
      const docs = await edinet.getDocumentsByDate(today);
      console.log(`✅ Found ${docs.total_count} documents for ${today}`);
      if (docs.documents.length > 0) {
        console.log(`   Example: ${docs.documents[0].filer_name}`);
      }
      passedTests++;
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log();

    // Test 2: Search companies (if we found any)
    totalTests++;
    try {
      console.log('Test 2: Search companies by name...');
      const results = await edinet.searchCompanies('ソニー', { limit: 3 });
      console.log(`✅ Found ${results.total_found} companies matching "ソニー"`);
      if (results.companies.length > 0) {
        console.log(`   Example: ${results.companies[0].name} (${results.companies[0].edinet_code})`);
      }
      passedTests++;
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log();
  }

  // ============= KOREA DART TESTS =============
  if (dartKey) {
    console.log('📊 Testing Korea DART API');
    console.log('-'.repeat(80));

    // Test 3: Search Korean companies
    totalTests++;
    try {
      console.log('Test 3: Search Korean companies...');
      const results = await dart.searchCompanies('삼성', { limit: 3 });
      console.log(`✅ Found ${results.total_found} companies matching "삼성"`);
      if (results.companies.length > 0) {
        const company = results.companies[0];
        console.log(`   Example: ${company.name} (${company.corp_code})`);

        // Test 4: Get company details
        totalTests++;
        try {
          console.log('Test 4: Get company details...');
          const details = await dart.getCompanyByCorpCode(company.corp_code);
          console.log(`✅ Retrieved company: ${details.name}`);
          console.log(`   CEO: ${details.ceo_name}`);
          console.log(`   Address: ${details.address}`);
          passedTests++;
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
        }
      }
      passedTests++;
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log();
  }

  // ============= SUMMARY =============
  console.log('='.repeat(80));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Tests passed: ${passedTests}/${totalTests}`);
  console.log();

  if (!edinetKey || !dartKey) {
    console.log('ℹ️  To run all tests, set API keys:');
    if (!edinetKey) {
      console.log('   export EDINET_API_KEY="your-key-here"');
    }
    if (!dartKey) {
      console.log('   export DART_API_KEY="your-key-here"');
    }
    console.log();
  }

  console.log('✅ Basic API tests complete!');
  console.log();
}

testAPIs().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
