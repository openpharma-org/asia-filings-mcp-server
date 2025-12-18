# Unofficial Asian Financial Filings MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to Asian financial filings via Japan's EDINET and South Korea's DART systems. This server enables AI assistants and applications to search, retrieve, and analyze financial statements and XBRL data from 7,700+ Asian companies.

## Key Features

- **Japan Coverage**: Access 5,000+ companies via EDINET (Electronic Disclosure for Investors' NETwork)
- **Korea Coverage**: Access 2,700+ companies via DART (Data Analysis, Retrieval and Transfer System)
- **Complete Filing Access**: Retrieve filing histories and document details
- **XBRL Parsing**: Full iXBRL/XBRL-JSON parsing with J-GAAP and K-GAAP taxonomy support
- **Dimensional Analysis**: Extract segment, geographic, and product breakdowns from financial data
- **Time-Series Analysis**: Multi-period growth rates, trends, and mix analysis (Phase 2)
- **Fact Tables**: Build BI-ready fact tables with value search and deviation analysis (Phase 2)
- **Comprehensive Data**: Company info, financial statements, shareholders, executives, dividends
- **MCP Compatible**: Works seamlessly with Cursor, Claude Desktop, and other MCP clients
- **Free APIs**: Both EDINET and DART provide free access (API keys required)

## What are EDINET and DART?

### EDINET (Japan)
The Electronic Disclosure for Investors' NETwork is Japan's mandatory electronic reporting system operated by the Financial Services Agency (FSA). Since 2008, all listed companies and major fund-raising entities must file their disclosure documents using EDINET in XBRL format with J-GAAP (Japanese GAAP) taxonomy.

**Data Source**: [EDINET](https://disclosure.edinet-fsa.go.jp/) - Free public access with API key registration

### DART (South Korea)
The Data Analysis, Retrieval and Transfer System is Korea's electronic disclosure repository operated by the Financial Supervisory Service (FSS). Companies on KOSPI, KOSDAQ, and KONEX exchanges file their reports through DART using K-GAAP/IFRS standards.

**Data Source**: [Open DART](https://opendart.fss.or.kr/) - Free public API with key registration

## Installation & Setup

### Prerequisites

You'll need API keys from both services (free registration):

1. **EDINET API Key**:
   - Visit: https://disclosure.edinet-fsa.go.jp/
   - Sign up with email
   - Complete multi-factor authentication
   - Receive your Subscription-Key

2. **DART API Key**:
   - Visit: https://opendart.fss.or.kr/intro/main.do
   - Register for free API access
   - Receive your API key
   - Rate limit: 1,000 requests/minute

### Usage

```json
{
  "mcpServers": {
    "asia-filings": {
      "command": "node",
      "args": ["/path/to/asia-filings-mcp-server/build/index.js"],
      "env": {
        "EDINET_API_KEY": "your-edinet-api-key-here",
        "DART_API_KEY": "your-dart-api-key-here"
      }
    }
  }
}
```

## Complete API Reference

The server provides a unified `asia-filings` tool with **19 powerful methods** (including Phase 2 advanced analytics):

### Japan EDINET Methods

#### 1. Search Companies (`search_japan_companies`)
Find Japanese companies by name (Japanese or English).

```json
{
  "method": "search_japan_companies",
  "query": "Toyota",
  "limit": 10
}
```

**Returns**: List of matching companies with EDINET codes and recent filing info.

#### 2. Get Company by EDINET Code (`get_japan_company_by_code`)
Look up a specific company using its EDINET code.

```json
{
  "method": "get_japan_company_by_code",
  "edinet_code": "E01225"
}
```

**Returns**: Company details including name, codes, and latest filing.

#### 3. Get Company Filings (`get_japan_company_filings`)
Retrieve filing history for a Japanese company.

```json
{
  "method": "get_japan_company_filings",
  "edinet_code": "E01225",
  "start_date": "2023-01-01",
  "end_date": "2024-12-31",
  "limit": 100
}
```

**Returns**: Array of filings with URLs for documents and viewer.

#### 4. Get Filing Document (`get_japan_filing_document`)
Download a specific filing document.

```json
{
  "method": "get_japan_filing_document",
  "document_id": "S100XXXX",
  "document_type": "4"
}
```

**Document Types**: 1=submission, 2=PDF, 3=attachments, 4=XBRL

#### 5. Get Documents by Date (`get_japan_documents_by_date`)
Get all filings submitted on a specific date.

```json
{
  "method": "get_japan_documents_by_date",
  "date": "2024-12-01"
}
```

#### 6. Get Filing Facts - XBRL Parser (`get_japan_filing_facts`)
Extract and parse XBRL facts from a Japanese filing document. Parses inline XBRL (iXBRL) with J-GAAP taxonomy.

```json
{
  "method": "get_japan_filing_facts",
  "document_id": "S100XXXX"
}
```

**Returns**: Parsed XBRL facts including:
- Numeric facts with values, units, and decimals
- Context information (periods, entities)
- Dimensional data (segments, geography)
- Summary statistics by fact type
- Taxonomy classification

#### 7. Get Dimensional Facts (`get_japan_dimensional_facts`)
Extract dimensional breakdowns from Japanese XBRL filings (e.g., revenue by segment, geography, or product line).

```json
{
  "method": "get_japan_dimensional_facts",
  "document_id": "S100XXXX",
  "search_criteria": {
    "concept": "revenue",
    "hasDimensions": true
  }
}
```

**Returns**: Filtered facts with dimensional analysis including geographic, segment, and product breakdowns.

### Korea DART Methods

#### 8. Search Companies (`search_korea_companies`)
Find Korean companies by name.

```json
{
  "method": "search_korea_companies",
  "query": "Samsung",
  "limit": 10
}
```

**Returns**: List of matching companies with corporate codes and recent filings.

#### 9. Get Company by Corporate Code (`get_korea_company_by_code`)
Look up a specific company using its corporate code.

```json
{
  "method": "get_korea_company_by_code",
  "corp_code": "00126380"
}
```

**Returns**: Comprehensive company profile including CEO, address, and business details.

#### 10. Get Company Filings (`get_korea_company_filings`)
Retrieve filing history for a Korean company.

```json
{
  "method": "get_korea_company_filings",
  "corp_code": "00126380",
  "start_date": "2023-01-01",
  "end_date": "2024-12-31",
  "report_type": "A",
  "limit": 100
}
```

**Report Types**: A=Annual, Q=Quarterly

#### 11. Get Financial Statements - XBRL Parser (`get_korea_financial_statements`)
Extract and parse XBRL financial data for a specific period. Parses K-GAAP/IFRS taxonomy data.

```json
{
  "method": "get_korea_financial_statements",
  "corp_code": "00126380",
  "business_year": "2023",
  "report_code": "11011"
}
```

**Report Codes**: 11011=Annual, 11013=Q1, 11012=Q2, 11014=Q3

**Returns**: Parsed XBRL financial facts including:
- Account names and IDs with K-GAAP concepts
- Current term, previous term, and before-previous term values
- Summary statistics by account type
- Taxonomy classification (Assets, Liabilities, Equity, Revenue, Expenses)

#### 12. Get Dimensional Facts (`get_korea_dimensional_facts`)
Extract dimensional breakdowns from Korean XBRL financial statements (e.g., revenue by business segment or geography).

```json
{
  "method": "get_korea_dimensional_facts",
  "corp_code": "00126380",
  "business_year": "2023",
  "report_code": "11011",
  "search_criteria": {
    "concept": "매출",
    "hasValue": true
  }
}
```

**Returns**: Filtered financial facts with dimensional analysis by geography, segments, and products.

#### 13. Get Major Shareholders (`get_korea_major_shareholders`)
Retrieve major shareholder information.

```json
{
  "method": "get_korea_major_shareholders",
  "corp_code": "00126380"
}
```

**Returns**: Shareholder names, ownership percentages, and change reasons.

#### 14. Get Executive Info (`get_korea_executive_info`)
Get information about company executives and officers.

```json
{
  "method": "get_korea_executive_info",
  "corp_code": "00126380"
}
```

**Returns**: Executive names, positions, birth years, and careers.

#### 15. Get Dividend Info (`get_korea_dividend_info`)
Retrieve dividend allocation information.

```json
{
  "method": "get_korea_dividend_info",
  "corp_code": "00126380",
  "business_year": "2023"
}
```

**Returns**: Dividend allocation details for the specified business year.

### Utility Methods

#### 16. Filter Filings (`filter_filings`)
Filter filing arrays by date, report type, and other criteria.

```json
{
  "method": "filter_filings",
  "filings": [...],
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "reportType": "Annual"
  }
}
```

**Returns**: Filtered filing array with counts.

### Advanced Analysis Methods (Phase 2)

#### 17. Build Fact Table (`build_fact_table`)
Build comprehensive fact table around a target value with business intelligence summaries. Searches for XBRL facts within a tolerance range and provides dimensional breakdowns.

```json
{
  "method": "build_fact_table",
  "country": "JP",
  "company_id": "E01225",
  "target_value": 1000000000000,
  "tolerance": 50000000000,
  "document_id": "S100XXXX",
  "options": {
    "maxRows": 25,
    "showDimensions": true,
    "sortBy": "deviation"
  }
}
```

**Parameters:**
- `country`: "JP" (Japan) or "KR" (Korea)
- `company_id`: EDINET code (JP) or corporate code (KR)
- `target_value`: Target value to search around (in Yen or Won)
- `tolerance`: Search range tolerance (±)
- `document_id`: Optional document ID (JP) or "businessYear:reportCode" format (KR)
- `options`: Table configuration (maxRows, sortBy, filters)

**Returns**: Comprehensive fact table with:
- Facts within value range sorted by deviation from target
- Business intelligence summaries
- Geographic and segment breakdowns
- Deviation analysis and exact matches
- Value statistics and business classifications

#### 18. Search Facts by Value (`search_facts_by_value`)
Alias for `build_fact_table` - search for XBRL facts within a value range. Same parameters and functionality as build_fact_table.

#### 19. Time Series Analysis (`time_series_analysis`)
Analyze financial metrics across multiple periods with period-over-period growth rates, geographic/segment mix changes, and trend detection.

```json
{
  "method": "time_series_analysis",
  "country": "KR",
  "company_id": "00126380",
  "options": {
    "concept": "Revenue",
    "periods": 4,
    "includeGeography": true,
    "includeSegments": true,
    "showGrowthRates": true
  }
}
```

**Parameters:**
- `country`: "JP" (Japan) or "KR" (Korea)
- `company_id`: EDINET code (JP) or corporate code (KR)
- `options`: Analysis configuration
  - `concept`: Financial concept to track (e.g., "Revenue", "Assets", "NetIncome")
  - `periods`: Number of periods to analyze (default: 4)
  - `includeGeography`: Include geographic breakdowns
  - `includeSegments`: Include segment breakdowns
  - `showGrowthRates`: Calculate period-over-period growth rates

**Returns**: Time-series analysis with:
- Multi-period data table with facts across time
- Period-over-period growth rates by geography/segment
- Geographic mix analysis (composition changes over time)
- Segment mix analysis (business segment evolution)
- Trend detection (increasing, decreasing, stable)
- Growth rate summaries and averages

## Coverage

### Japan (EDINET)
- **Companies**: ~5,000 listed companies + 3,000 investment funds
- **Exchange**: Tokyo Stock Exchange (TSE)
- **Market Divisions**: Prime, Standard, Growth
- **Taxonomy**: J-GAAP (Japanese GAAP)
- **Document Types**: 65 types including annual reports, quarterly reports, securities reports
- **Historical Data**: From 2008+ (XBRL mandate start)

### South Korea (DART)
- **Companies**: ~2,700 listed companies
- **Exchanges**:
  - KOSPI: ~880 companies
  - KOSDAQ: ~1,700 companies
  - KONEX: ~129 companies
- **Taxonomy**: K-GAAP / IFRS
- **Disclosure Types**: Annual, quarterly, major issues, equity, issuance, miscellaneous
- **Additional Data**: Shareholder info, executive details, dividends

## Real-World Use Cases

### Investment Research
```json
{
  "method": "search_japan_companies",
  "query": "Sony",
  "limit": 5
}
```
*Find Japanese technology companies and analyze their financial statements*

### Cross-Market Analysis
```json
{
  "method": "search_korea_companies",
  "query": "삼성전자",
  "limit": 10
}
```
*Compare Korean electronics companies' financial performance*

### Financial Data Extraction
```json
{
  "method": "get_korea_financial_statements",
  "corp_code": "00126380",
  "business_year": "2023",
  "report_code": "11011"
}
```
*Extract structured XBRL financial data for analysis*

### Shareholder Analysis
```json
{
  "method": "get_korea_major_shareholders",
  "corp_code": "00126380"
}
```
*Track major shareholder positions and ownership changes*

### XBRL Parsing and Analysis
```json
{
  "method": "get_japan_filing_facts",
  "document_id": "S100XXXX"
}
```
*Parse inline XBRL from Japanese filings to extract structured financial data*

```json
{
  "method": "get_korea_dimensional_facts",
  "corp_code": "00126380",
  "business_year": "2023",
  "report_code": "11011",
  "search_criteria": {
    "concept": "revenue",
    "hasDimensions": true
  }
}
```
*Extract dimensional breakdowns showing revenue by business segment or geography*

## XBRL Parser Capabilities

The server includes comprehensive XBRL parsing for both Japanese and Korean filings:

### Japan (EDINET) - iXBRL Parser
- **Format**: Inline XBRL (iXBRL) embedded in HTML
- **Taxonomy**: J-GAAP (Japanese GAAP)
- **Parsing**: Extracts facts from `ix:nonFraction` and `ix:nonNumeric` tags
- **Contexts**: Full period, entity, and dimensional context extraction
- **Scale Handling**: Automatic scale factor application (millions, billions)
- **Number Formats**: Japanese negative number symbols (△, ▲, －)

### Korea (DART) - XBRL-JSON Parser
- **Format**: XBRL data in JSON format from API
- **Taxonomy**: K-GAAP / IFRS
- **Parsing**: Account names, IDs, and multi-period values
- **Periods**: Current term, previous term, before-previous term
- **Korean Support**: Native Korean account names (매출, 자산, 부채, 자본, etc.)

### Common Features
- **Fact Classification**: Automatic categorization (Assets, Liabilities, Equity, Revenue, Expenses, Cash Flow)
- **Dimensional Extraction**: Geography, business segments, product lines
- **Value Filtering**: Search by concept, value range, period, dimensions
- **Summary Statistics**: Aggregated data by type, namespace, and dimension
- **UTF-8 Support**: Full Japanese (漢字, ひらがな, カタカナ) and Korean (한글) character support

## Taxonomy Reference

### Japan - J-GAAP (Japanese GAAP)
Japanese companies follow J-GAAP taxonomy which differs from US-GAAP and IFRS. The EDINET taxonomy is designed to comply with Global Filing Manual (GFM) rules.

**Future Development**: Japan plans to adopt the ISSB taxonomy with Japan-specific extensions by 2027.

### Korea - K-GAAP / IFRS
Korean companies use either K-GAAP (Korean GAAP) or IFRS depending on their size and listing status. Financial statements are available in XBRL format through the DART API.

## Architecture

```
asia-filings-mcp-server/
├── src/
│   ├── index.js              # MCP server implementation
│   ├── edinet-api.js         # Japan EDINET API client
│   ├── dart-api.js           # Korea DART API client
│   ├── xbrl-parser.js        # XBRL/iXBRL parser (J-GAAP, K-GAAP)
│   ├── fact-table-builder.js # Fact table generation & BI summaries
│   └── time-series-analyzer.js # Multi-period growth & trend analysis
├── package.json
└── README.md
```

## Comparison with SEC/EU Servers

| Feature | SEC EDGAR | EU Filings (ESEF) | Asia Filings |
|---------|-----------|-------------------|--------------|
| **Coverage** | US companies | 27+ EU countries | Japan + South Korea |
| **Companies** | 10,000+ | 23,000+ | 7,700+ |
| **Format** | iXBRL | iXBRL | XBRL/iXBRL |
| **Taxonomy** | US-GAAP | IFRS | J-GAAP, K-GAAP/IFRS |
| **Company ID** | CIK | LEI | EDINET Code, Corp Code |
| **Data Source** | data.sec.gov | filings.xbrl.org | EDINET, DART |
| **API Cost** | Free | Free | Free (keys required) |
| **Authentication** | User-Agent | None | API Keys |