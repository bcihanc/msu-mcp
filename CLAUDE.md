# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Server
```bash
npm start              # Start the MCP server
npm run dev            # Start in development mode (same as start)
npx .                  # Run via npx from project directory
npx msu-mcp           # Run via npx (after publishing)
./bin/msu-mcp.js      # Direct execution of binary
```

### Environment Setup
The server requires these environment variables:
- `MSU_MERCHANT` - Merchant identifier
- `MSU_MERCHANT_USER` - Merchant user for API authentication
- `MSU_MERCHANT_PASSWORD` - Merchant password for API authentication

## Architecture Overview

This is an **MCP (Model Context Protocol) Server** that provides payment transaction querying capabilities for the MSU (MerchantSafe Unipay) payment gateway.

### Core Components

**Main Server (`src/index.js`):**
- Implements MCP server using `@modelcontextprotocol/sdk`
- Two tools: `query_transaction` and `query_customer` for querying payment data
- Handles MSU API authentication and form data submission
- Enhances responses with human-readable error code explanations
- Encodes responses in TOON (Token-Oriented Object Notation) format for token efficiency

**CLI Binary (`bin/msu-mcp.js`):**
- Executable entry point for running the MCP server
- Imports and executes the main server module
- Allows installation as a global CLI tool

**Error Code Mapping (`src/error-codes.js`):**
- Complete mapping of MSU error codes (ERR10010-ERR30005) to Turkish descriptions
- Used to automatically explain error codes found in API responses

### Key Technical Details

**MCP Integration:**
- Uses stdio transport for communication
- Follows MCP protocol for tool definition and execution
- Single capability: tools

**MSU API Integration:**
- Base URL: `https://merchantsafeunipay.com/msu/api/v2`
- Uses form-encoded POST requests with merchant credentials
- ACTION parameter: `QUERYTRANSACTION`
- Supports comprehensive transaction filtering (date ranges, customer info, transaction status, etc.)

**Error Enhancement:**
The `enhanceResponseWithErrorCodes()` function automatically:
- Scans API responses for MSU error codes (pattern: ERR##### format)
- Adds explanatory fields with human-readable descriptions
- Preserves original response structure while adding context

**Response Format (TOON):**
All tool responses are encoded in TOON (Token-Oriented Object Notation) format:
- Uses `@toon-format/toon` library for encoding
- Comma delimiter (default) for array values
- ~40% fewer tokens compared to JSON
- Maintains full data structure with clear array headers
- Example: `transactions[2]{id,amount}:\n  TX1,100.50\n  TX2,200.99`

### Transaction Query Parameters
Supports filtering by:
- Transaction ID (`pgtranid`)
- Date ranges (`start_date`, `end_date` in dd-MM-yyyy HH:mm format)
- Merchant payment ID (`merchant_payment_id`)
- Customer details (name, email, phone, system ID)
- Transaction status
- Pagination (offset, limit - default 1000)

## Important Implementation Notes

- No test framework configured
- No build process required (plain Node.js ES modules)
- All API communication uses form-encoded data, not JSON
- **Responses are encoded in TOON format** (not JSON) for optimal token efficiency
- Error codes are automatically enhanced in responses for better debugging
- Requires Node.js >=18.0.0
- Package includes CLI binary for global installation
- Uses ES modules (type: "module" in package.json)

## Installation & Usage

### Local Development
```bash
npm install
npm start
```

### NPX Usage
```bash
npx .                  # Run from project directory
npx msu-mcp           # Run published package
```

### Global Installation
```bash
npm install -g .
msu-mcp
```

### Package Information
- **Name**: msu-mcp
- **Version**: 1.0.0
- **License**: MIT
- **Main Entry**: src/index.js
- **Binary**: bin/msu-mcp.js
- **Dependencies**:
  - `@modelcontextprotocol/sdk`: ^1.16.0
  - `@toon-format/toon`: ^1.4.0