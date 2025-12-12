# Asian Financial Filings MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to Asian financial filings via Japan's EDINET and South Korea's DART systems. This server enables AI assistants and applications to search, retrieve, and analyze financial statements and XBRL data from 7,700+ Asian companies.

## 🚀 Key Features

- 🇯🇵 **Japan Coverage**: Access 5,000+ companies via EDINET (Electronic Disclosure for Investors' NETwork)
- 🇰🇷 **Korea Coverage**: Access 2,700+ companies via DART (Data Analysis, Retrieval and Transfer System)
- 📋 **Complete Filing Access**: Retrieve filing histories and document details
- 📊 **XBRL Data Extraction**: Parse and analyze J-GAAP and K-GAAP tagged financial data
- 🏢 **Comprehensive Data**: Company info, financial statements, shareholders, executives, dividends
- 🔌 **MCP Compatible**: Works seamlessly with Cursor, Claude Desktop, and other MCP clients
- ⚡ **Free APIs**: Both EDINET and DART provide free access (API keys required)

## 🎯 What are EDINET and DART?

### EDINET (Japan)
The Electronic Disclosure for Investors' NETwork is Japan's mandatory electronic reporting system operated by the Financial Services Agency (FSA). Since 2008, all listed companies and major fund-raising entities must file their disclosure documents using EDINET in XBRL format with J-GAAP (Japanese GAAP) taxonomy.

**Data Source**: [EDINET](https://disclosure.edinet-fsa.go.jp/) - Free public access with API key registration

### DART (South Korea)
The Data Analysis, Retrieval and Transfer System is Korea's electronic disclosure repository operated by the Financial Supervisory Service (FSS). Companies on KOSPI, KOSDAQ, and KONEX exchanges file their reports through DART using K-GAAP/IFRS standards.

**Data Source**: [Open DART](https://opendart.fss.or.kr/) - Free public API with key registration

## 📊 Complete API Reference

The server provides a unified `asia-filings` tool with **13 powerful methods**:

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

### Korea DART Methods

#### 6. Search Companies (`search_korea_companies`)
Find Korean companies by name.

```json
{
  "method": "search_korea_companies",
  "query": "Samsung",
  "limit": 10
}
```

**Returns**: List of matching companies with corporate codes and recent filings.

#### 7. Get Company by Corporate Code (`get_korea_company_by_code`)
Look up a specific company using its corporate code.

```json
{
  "method": "get_korea_company_by_code",
  "corp_code": "00126380"
}
```

**Returns**: Comprehensive company profile including CEO, address, and business details.

#### 8. Get Company Filings (`get_korea_company_filings`)
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

#### 9. Get Financial Statements (`get_korea_financial_statements`)
Extract XBRL financial data for a specific period.

```json
{
  "method": "get_korea_financial_statements",
  "corp_code": "00126380",
  "business_year": "2023",
  "report_code": "11011"
}
```

**Report Codes**: 11011=Annual, 11013=Q1, 11012=Q2, 11014=Q3

**Returns**: Financial statement items with account names, values, and classifications.

#### 10. Get Major Shareholders (`get_korea_major_shareholders`)
Retrieve major shareholder information.

```json
{
  "method": "get_korea_major_shareholders",
  "corp_code": "00126380"
}
```

**Returns**: Shareholder names, ownership percentages, and change reasons.

#### 11. Get Executive Info (`get_korea_executive_info`)
Get information about company executives and officers.

```json
{
  "method": "get_korea_executive_info",
  "corp_code": "00126380"
}
```

**Returns**: Executive names, positions, birth years, and careers.

#### 12. Get Dividend Info (`get_korea_dividend_info`)
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

#### 13. Filter Filings (`filter_filings`)
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

## 📥 Installation & Setup

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

### Quick Start with Claude Desktop

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "asia-filings": {
      "command": "node",
      "args": ["/path/to/asia-filings-mcp-server/src/index.js"],
      "env": {
        "EDINET_API_KEY": "your-edinet-api-key-here",
        "DART_API_KEY": "your-dart-api-key-here"
      }
    }
  }
}
```

### Installation from NPM (Coming Soon)

```bash
npm install -g @openpharma/asia-filings-mcp-server
```

Then in your MCP config:

```json
{
  "mcpServers": {
    "asia-filings": {
      "command": "npx",
      "args": ["@openpharma/asia-filings-mcp-server"],
      "env": {
        "EDINET_API_KEY": "your-edinet-api-key-here",
        "DART_API_KEY": "your-dart-api-key-here"
      }
    }
  }
}
```

### Development Setup

```bash
# Clone the repository
cd asia-filings-mcp-server

# Install dependencies
npm install

# Set environment variables
export EDINET_API_KEY="your-edinet-api-key"
export DART_API_KEY="your-dart-api-key"

# Run the server
npm start
```

## 🌍 Coverage

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

## 🎯 Real-World Use Cases

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

## 📊 Taxonomy Reference

### Japan - J-GAAP (Japanese GAAP)
Japanese companies follow J-GAAP taxonomy which differs from US-GAAP and IFRS. The EDINET taxonomy is designed to comply with Global Filing Manual (GFM) rules.

**Future Development**: Japan plans to adopt the ISSB taxonomy with Japan-specific extensions by 2027.

### Korea - K-GAAP / IFRS
Korean companies use either K-GAAP (Korean GAAP) or IFRS depending on their size and listing status. Financial statements are available in XBRL format through the DART API.

## 🏗️ Architecture

```
asia-filings-mcp-server/
├── src/
│   ├── index.js         # MCP server implementation
│   ├── edinet-api.js    # Japan EDINET API client
│   └── dart-api.js      # Korea DART API client
├── package.json
└── README.md
```

### Data Flow

1. **MCP Client** (Claude, Cursor) calls `asia-filings` tool
2. **MCP Server** routes to appropriate method (Japan or Korea)
3. **API Client** queries EDINET or DART API
4. **Response** returned in JSON format

### API Compliance

- ✅ **Free APIs**: Both EDINET and DART are free to use
- ✅ **Rate Limiting**: Conservative request pacing implemented
- ✅ **Authentication**: API keys required (free registration)
- ✅ **Error Recovery**: Graceful degradation with error messages

## 🔄 Comparison with SEC/EU Servers

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

## 🚀 Future Enhancements

### Phase 2 (Planned)
- XBRL parser for J-GAAP taxonomy
- XBRL parser for K-GAAP taxonomy
- Dimensional fact extraction
- Time-series financial analysis
- Fact table building

### Phase 3 (Planned)
- Advanced analytics (growth rates, ratios)
- Cross-company comparison
- Multi-market aggregation
- ESG/sustainability data

### Additional Markets (Under Investigation)
- Hong Kong Stock Exchange (HKEx)
- Taiwan Stock Exchange (TWSE)
- Singapore Exchange (SGX) - filing submission only currently

## 📚 Resources

- 🇯🇵 **EDINET**: [Japan FSA EDINET](https://disclosure.edinet-fsa.go.jp/)
- 🇰🇷 **DART**: [Korea FSS Open DART](https://opendart.fss.or.kr/)
- 🇰🇷 **English DART**: [English DART Portal](https://englishdart.fss.or.kr/)
- 📖 **XBRL Japan**: [XBRL Japan Inc.](https://www.xbrl.or.jp/modules/pico5/index.php?ml_lang=en)

## 🤝 Contributing

Contributions are welcome! This is an open-source project aimed at improving access to Asian financial data.

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Important Notes

- This is an unofficial tool not affiliated with Japan FSA or Korea FSS
- API keys are required for both EDINET and DART (free registration)
- Always verify critical financial data through official regulatory sources
- EDINET filings are available from 2008 onwards
- DART covers companies on KOSPI, KOSDAQ, and KONEX exchanges
- Some Japanese content may require UTF-8 encoding support

## 🐛 Known Limitations

1. **Language**: EDINET documentation is primarily in Japanese
2. **API Keys**: Both services require free API key registration
3. **Rate Limits**: DART has 1,000 requests/minute limit; EDINET limits unspecified
4. **Historical Data**: Limited to XBRL mandate dates (2008+ for Japan)
5. **XBRL Parsing**: Advanced XBRL parsing features are planned for Phase 2

## 💡 Tips

- **Register for API keys early**: Both services have simple registration but require approval
- **Use specific codes**: EDINET codes (Japan) and corp codes (Korea) for fastest results
- **Check date ranges**: Some companies may have limited filing history
- **UTF-8 support**: Ensure your environment supports Japanese and Korean characters
- **Rate limiting**: DART enforces 1,000 req/min; EDINET is unspecified but be conservative

---

**Built with ❤️ for the global financial data community**

Part of the OpenPharma MCP Server collection providing comprehensive access to financial data from:
- 🇺🇸 [SEC EDGAR](https://github.com/openpharma-org/sec-mcp)
- 🇪🇺 [EU Filings](https://github.com/openpharma-org/eu-filings-mcp-server)
- 🌏 **Asia Filings** (this server)

For questions, issues, or feature requests, please visit our [GitHub repository](https://github.com/openpharma-org/asia-filings-mcp-server).
