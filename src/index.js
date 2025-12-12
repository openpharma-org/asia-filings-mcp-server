#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import * as edinetApi from './edinet-api.js';
import * as dartApi from './dart-api.js';

const server = new Server(
  {
    name: 'asia-filings-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'asia-filings',
        description: 'Unified tool for Asian financial filings: access company filings, financial statements, and XBRL data from Japan (EDINET) and South Korea (DART). Provides comprehensive access to financial reports from 7,700+ Asian companies.',
        inputSchema: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              enum: [
                // Japan EDINET methods
                'search_japan_companies',
                'get_japan_company_by_code',
                'get_japan_company_filings',
                'get_japan_filing_document',
                'get_japan_documents_by_date',
                // Korea DART methods
                'search_korea_companies',
                'get_korea_company_by_code',
                'get_korea_company_filings',
                'get_korea_financial_statements',
                'get_korea_major_shareholders',
                'get_korea_executive_info',
                'get_korea_dividend_info',
                // Utility methods
                'filter_filings'
              ],
              description: `The operation to perform:

JAPAN (EDINET):
- search_japan_companies: Search Japanese companies by name
- get_japan_company_by_code: Get company by EDINET code
- get_japan_company_filings: Get filing history for Japanese company
- get_japan_filing_document: Download specific filing document
- get_japan_documents_by_date: Get all filings for a specific date

KOREA (DART):
- search_korea_companies: Search Korean companies by name
- get_korea_company_by_code: Get company by corporate code
- get_korea_company_filings: Get filing history for Korean company
- get_korea_financial_statements: Get financial statements (XBRL)
- get_korea_major_shareholders: Get major shareholder information
- get_korea_executive_info: Get executive/officer information
- get_korea_dividend_info: Get dividend allocation information

UTILITIES:
- filter_filings: Filter filing arrays by criteria`,
              examples: ['search_japan_companies', 'get_korea_financial_statements']
            },
            query: {
              type: 'string',
              description: 'For search methods: Company name to search (Japanese, Korean, or English)',
              examples: ['Toyota', 'Samsung', 'ソニー', '삼성전자']
            },
            edinet_code: {
              type: 'string',
              description: 'For Japan methods: EDINET code (E-number)',
              examples: ['E01225', 'E02166', 'E05080']
            },
            corp_code: {
              type: 'string',
              description: 'For Korea methods: Corporate code',
              examples: ['00126380', '00164742']
            },
            document_id: {
              type: 'string',
              description: 'For get_japan_filing_document: Document ID from EDINET',
              examples: ['S100XXXX']
            },
            document_type: {
              type: 'string',
              description: 'For get_japan_filing_document: Document type (1: submission, 2: PDF, 3: attachments, 4: XBRL)',
              examples: ['1', '2', '4']
            },
            date: {
              type: 'string',
              description: 'For get_japan_documents_by_date: Date in YYYY-MM-DD format',
              examples: ['2024-12-01', '2024-11-15']
            },
            start_date: {
              type: 'string',
              description: 'For filing methods: Start date in YYYY-MM-DD format',
              examples: ['2023-01-01', '2024-01-01']
            },
            end_date: {
              type: 'string',
              description: 'For filing methods: End date in YYYY-MM-DD format',
              examples: ['2024-12-31', '2024-06-30']
            },
            business_year: {
              type: 'string',
              description: 'For get_korea_financial_statements, get_korea_dividend_info: Business year (YYYY)',
              examples: ['2023', '2024']
            },
            report_code: {
              type: 'string',
              description: 'For get_korea_financial_statements: Report code (11011: Annual, 11013: Q1, 11012: Q2, 11014: Q3)',
              examples: ['11011', '11013']
            },
            report_type: {
              type: 'string',
              description: 'For get_korea_company_filings: Report type filter',
              examples: ['A', 'Q']
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return',
              examples: [10, 25, 50, 100]
            },
            filings: {
              type: 'array',
              description: 'For filter_filings: Array of filing objects to filter',
              items: { type: 'object' }
            },
            filters: {
              type: 'object',
              description: 'For filter_filings: Filter criteria (startDate, endDate, reportType)'
            }
          },
          required: ['method'],
          additionalProperties: false
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== 'asia-filings') {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    const { method, ...params } = args;

    switch (method) {
      // ============= JAPAN EDINET METHODS =============

      case 'search_japan_companies': {
        const { query, limit, date } = params;
        if (!query) {
          throw new Error('query parameter is required for search_japan_companies');
        }

        const results = await edinetApi.searchCompanies(query, { limit, date });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_japan_company_by_code': {
        const { edinet_code } = params;
        if (!edinet_code) {
          throw new Error('edinet_code parameter is required for get_japan_company_by_code');
        }

        const result = await edinetApi.getCompanyByEdinetCode(edinet_code);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_japan_company_filings': {
        const { edinet_code, start_date, end_date, limit } = params;
        if (!edinet_code) {
          throw new Error('edinet_code parameter is required for get_japan_company_filings');
        }

        const results = await edinetApi.getCompanyFilings(edinet_code, {
          startDate: start_date,
          endDate: end_date,
          limit
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_japan_filing_document': {
        const { document_id, document_type } = params;
        if (!document_id) {
          throw new Error('document_id parameter is required for get_japan_filing_document');
        }

        const result = await edinetApi.getFilingDocument(document_id, document_type || '1');

        // For binary data, return metadata only
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                document_id: result.document_id,
                type: result.type,
                content_type: result.content_type,
                note: 'Document downloaded successfully. Binary data not displayed.'
              }, null, 2)
            }
          ]
        };
      }

      case 'get_japan_documents_by_date': {
        const { date } = params;
        if (!date) {
          throw new Error('date parameter is required for get_japan_documents_by_date');
        }

        const results = await edinetApi.getDocumentsByDate(date);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      // ============= KOREA DART METHODS =============

      case 'search_korea_companies': {
        const { query, limit } = params;
        if (!query) {
          throw new Error('query parameter is required for search_korea_companies');
        }

        const results = await dartApi.searchCompanies(query, { limit });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_korea_company_by_code': {
        const { corp_code } = params;
        if (!corp_code) {
          throw new Error('corp_code parameter is required for get_korea_company_by_code');
        }

        const result = await dartApi.getCompanyByCorpCode(corp_code);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_korea_company_filings': {
        const { corp_code, start_date, end_date, report_type, limit } = params;
        if (!corp_code) {
          throw new Error('corp_code parameter is required for get_korea_company_filings');
        }

        const results = await dartApi.getCompanyFilings(corp_code, {
          startDate: start_date,
          endDate: end_date,
          reportType: report_type,
          limit
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_korea_financial_statements': {
        const { corp_code, business_year, report_code } = params;
        if (!corp_code || !business_year) {
          throw new Error('corp_code and business_year parameters are required for get_korea_financial_statements');
        }

        const results = await dartApi.getFinancialStatements(corp_code, business_year, report_code);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_korea_major_shareholders': {
        const { corp_code } = params;
        if (!corp_code) {
          throw new Error('corp_code parameter is required for get_korea_major_shareholders');
        }

        const results = await dartApi.getMajorShareholders(corp_code);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_korea_executive_info': {
        const { corp_code } = params;
        if (!corp_code) {
          throw new Error('corp_code parameter is required for get_korea_executive_info');
        }

        const results = await dartApi.getExecutiveInfo(corp_code);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'get_korea_dividend_info': {
        const { corp_code, business_year } = params;
        if (!corp_code || !business_year) {
          throw new Error('corp_code and business_year parameters are required for get_korea_dividend_info');
        }

        const results = await dartApi.getDividendInfo(corp_code, business_year);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      // ============= UTILITY METHODS =============

      case 'filter_filings': {
        const { filings, filters } = params;
        if (!filings || !Array.isArray(filings)) {
          throw new Error('filings array parameter is required for filter_filings');
        }

        const results = dartApi.filterFilings(filings, filters || {});
        const response = {
          originalCount: filings.length,
          filteredCount: results.length,
          filters: filters || {},
          filings: results,
          source: 'Asia Filings Filter'
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with JSON-RPC
  process.stderr.write('Asia Filings MCP server running on stdio\n');
}

main().catch((error) => {
  process.stderr.write(`Server error: ${error}\n`);
  process.exit(1);\n});
