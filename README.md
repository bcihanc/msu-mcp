# 💳 MSU MCP Server

An MCP (Model Context Protocol) server for querying payment transactions from the MSU (MerchantSafe Unipay) payment gateway.

## ✨ Features

- 🔍 Query payment transactions with comprehensive filtering options
- 👤 Query customer details and information
- 💳 Query saved card tokens and card details
- 🌐 Automatic error code translation to human-readable Turkish descriptions
- 📊 **TOON format responses** - Token-efficient data encoding for LLMs (~40% fewer tokens than JSON)
- 🤖 MCP protocol integration for AI model context
- ⚡ CLI tool for easy deployment

## ⚙️ Configuration

### 🔐 Environment Variables

Set the following environment variables:

```bash
export MSU_MERCHANT="your_merchant_id"
export MSU_MERCHANT_USER="your_merchant_user"
export MSU_MERCHANT_PASSWORD="your_merchant_password"
```

### 🔧 MCP Server Configuration

To integrate with MCP-compatible applications (like Claude Desktop), add this to your MCP configuration:

```json
{
  "mcpServers": {
    "msu-mcp": {
      "command": "npx",
      "args": ["-y", "github:bcihanc/msu-mcp"],
      "env": {
        "MSU_MERCHANT": "your-merchant-id",
        "MSU_MERCHANT_USER": "your-user",
        "MSU_MERCHANT_PASSWORD": "your-password"
      }
    }
  }
}
```

## 🔍 Available Tools

### Transaction Query Tool

The `query_transaction` tool supports filtering by:

- 🆔 **Transaction ID** (`pgtranid`)
- 📅 **Date Range** (`start_date`, `end_date` in dd-MM-yyyy HH:mm format)
- 💼 **Merchant Payment ID** (`merchant_payment_id`)
- 👤 **Customer Details** (name, email, phone, system ID)
- 📊 **Transaction Status**
- 📄 **Pagination** (offset, limit - default 1000)

### Customer Query Tool

The `query_customer` tool supports querying by:

- 🆔 **Customer System ID** (`customer`) - Unique merchant system ID (max 128 chars)
- 👤 **Customer Name** (`customer_name`) - Name of the customer (max 128 chars)
- 📧 **Customer Email** (`customer_email`) - Customer email address (max 64 chars)
- 📱 **Customer Phone** (`customer_phone`) - Customer phone/mobile number (max 64 chars)

### Card Query Tool

The `query_card` tool supports querying by:

- 🔑 **Card Token** (`cardtoken`) - Unique token replacing card number & expiry (max 64 chars)
- 📝 **Card Save Name** (`cardsavename`) - Given name for the saved card (max 255 chars)
- 🆔 **Customer System ID** (`customer`) - Unique merchant system ID (max 128 chars)
- 👥 **Card Sharing Group** (`forgroup`) - Query cards from merchant group (default: 'no', max 3 chars)
- 📅 **Date Range** (`start_date`, `end_date` in dd-MM-yyyy HH:mm format)
- 🏪 **Dealer Code** (`dealercode`) - The dealer code (max 32 chars)
- 🔐 **Encrypted PAN** (`encryptedpan`) - Encrypted card number (max 1024 chars)
- 📄 **Pagination** (offset, limit - default 1000)

Returns card information including brand, type, last 4 digits, expiry date, issuer details, and token.

### Card Details Query Tool

The `query_card_details` tool queries cards saved with a specific session token:

- 🎫 **Session Token** (`sessiontoken`) - **Required**. Unique session token (max 48 chars)

Returns card count (cardCount, totalCardCount) and detailed card list with same information as query_card tool.

### Session Query Tool

The `query_session` tool retrieves session information:

- 🎫 **Session Token** (`sessiontoken`) - **Required**. Unique session token (max 48 chars)

Returns comprehensive session details including:
- 📋 **Session**: Status, amounts, currency, timestamps, API action, merchant payment ID
- 🏢 **Merchant**: Business ID, name, address, contact info, web address, wallet model
- 👤 **Customer**: ID, email, phone, name, last login timestamp

## 🔧 Error Code Enhancement

The server automatically enhances MSU API responses by:
- 🔍 Detecting error codes in ERR##### format
- 🌐 Adding Turkish explanations for better debugging
- 🔄 Preserving original response structure

## 📊 TOON Format Response

All responses are returned in **TOON (Token-Oriented Object Notation)** format for optimal token efficiency when working with LLMs.

**Example Response:**
```toon
status: success
merchant: TEST_MERCHANT
total_count: 2
transactions[2]{pgtranid,merchant_payment_id,amount,currency,status,customer_name,error_code}:
  PG123456789,ORDER_001,"150.50",TRY,AP,Ahmet Yılmaz,""
  PG987654321,ORDER_002,"299.99",USD,FA,Mehmet Demir,ERR10010
error_explanations:
  ERR10010: "İstekte zorunlu parametrelerden biri bulunamadı"
```

**Benefits:**
- 📉 **~50% fewer tokens** compared to JSON (optimized CSV-style format)
- 🎯 **CSV-style arrays** - Field names declared once, then only values
- 📋 **Separate error map** - Error explanations at root level, not inline
- 🔍 Human-readable while optimized for LLMs
- 🔄 Lossless round-trip conversion to/from JSON

**Learn more:** https://github.com/toon-format/toon

## 🛠️ Technical Details

- 🟢 **Node.js**: >=18.0.0 required
- 🔗 **Protocol**: MCP (Model Context Protocol)
- 🔌 **API**: MSU MerchantSafe Unipay v2
- 📝 **Data Format**: Form-encoded requests, TOON format responses
- 📊 **Response Encoding**: TOON (Token-Oriented Object Notation) with comma delimiter
- 🚀 **Transport**: stdio

## 🌐 API Integration

- 🔗 **Base URL**: `https://merchantsafeunipay.com/msu/api/v2`
- ⚡ **Actions**: `QUERYTRANSACTION`, `QUERYCUSTOMER`, `QUERYCARD`, `QUERYCARDDETAILS`, `QUERYSESSION`
- 🔐 **Authentication**: Merchant credentials via form data
- 🚨 **Error Codes**: ERR10010-ERR30005 with Turkish descriptions

## 📁 Project Structure

```
msu-mcp/
├── bin/
│   └── msu-mcp.js          # 🚀 CLI executable
├── src/
│   ├── index.js            # 🖥️ Main MCP server
│   └── error-codes.js      # 🔧 Error code mappings
├── package.json
├── CLAUDE.md              # 📖 Development guidance
└── README.md
```

## 📄 License

MIT

## 👨‍💻 Author

Cihan
