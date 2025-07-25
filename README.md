# 💳 MSU MCP Server

An MCP (Model Context Protocol) server for querying payment transactions from the MSU (MerchantSafe Unipay) payment gateway.

## ✨ Features

- 🔍 Query payment transactions with comprehensive filtering options
- 👤 Query customer details and information
- 🌐 Automatic error code translation to human-readable Turkish descriptions  
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

## 🔧 Error Code Enhancement

The server automatically enhances MSU API responses by:
- 🔍 Detecting error codes in ERR##### format
- 🌐 Adding Turkish explanations for better debugging
- 🔄 Preserving original response structure

## 🛠️ Technical Details

- 🟢 **Node.js**: >=18.0.0 required
- 🔗 **Protocol**: MCP (Model Context Protocol)
- 🔌 **API**: MSU MerchantSafe Unipay v2
- 📝 **Data Format**: Form-encoded requests, JSON responses
- 🚀 **Transport**: stdio

## 🌐 API Integration

- 🔗 **Base URL**: `https://merchantsafeunipay.com/msu/api/v2`
- ⚡ **Action**: `QUERYTRANSACTION`
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
