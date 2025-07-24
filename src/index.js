#!/usr/bin/env node

import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {CallToolRequestSchema, ListToolsRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import {MSU_ERROR_CODES} from "./error-codes.js";

const MSU_API_BASE_URL = "https://merchantsafeunipay.com/msu/api/v2";
const MSU_MERCHANT = process.env.MSU_MERCHANT;
const MSU_MERCHANT_USER = process.env.MSU_MERCHANT_USER;
const MSU_MERCHANT_PASSWORD = process.env.MSU_MERCHANT_PASSWORD;

// Function to enhance response with error code explanations
function enhanceResponseWithErrorCodes(data) {
    if (typeof data === 'object' && data !== null) {
        const enhanced = { ...data };

        // Look for error codes in the response
        const findAndExplainErrors = (obj, path = '') => {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && value.startsWith('ERR')) {
                    const errorCode = value.match(/ERR\d{5}/)?.[0];
                    if (errorCode && MSU_ERROR_CODES[errorCode]) {
                        const newKey = key + '_explanation';
                        obj[newKey] = `${errorCode}: ${MSU_ERROR_CODES[errorCode]}`;
                    }
                } else if (typeof value === 'object' && value !== null) {
                    findAndExplainErrors(value, path ? `${path}.${key}` : key);
                }
            }
        };

        findAndExplainErrors(enhanced);
        return enhanced;
    }
    return data;
}

const server = new Server({
    name: "msu-mcp",
    version: "1.0.0"
}, {
    capabilities: {tools: {}}
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
        name: "query_transaction",
        description: "Query payment transaction details from MSU (MerchantSafe Unipay) payment gateway. Returns transaction status, amount, payment method, timestamps, and customer information. Can query by transaction ID, date range, or customer details. Without specific identifiers, returns last 30 days of transactions.",
        inputSchema: {
            type: "object",
            properties: {
                pgtranid: {
                    type: "string",
                    description: "Transaction ID given by payment gateway."
                },
                start_date: {
                    type: "string",
                    description: "Start date for transaction search in dd-MM-yyyy HH:mm format (max length: 16)"
                },
                end_date: {
                    type: "string",
                    description: "End date for transaction search in dd-MM-yyyy HH:mm format (max length: 16)"
                },
                merchant_payment_id: {
                    type: "string",
                    description: "Payment ID given by Merchant (must be unique, max length: 128). Recommended max 40 characters.",
                    maxLength: 128
                },
                customer_name: {
                    type: "string",
                    description: "Name of the Customer (max length: 128)",
                    maxLength: 128
                },
                offset: {
                    type: "string",
                    description: "Specifies the number from which transactions will start for pagination (max length: 10, default: '0')",
                    maxLength: 10
                },
                limit: {
                    type: "string",
                    description: "The maximum number of transactions in response (max length: 4, default: '1000')",
                    maxLength: 4
                },
                customer: {
                    type: "string",
                    description: "The Merchant System ID for customer. It must be unique within a Merchant (max length: 128)",
                    maxLength: 128
                },
                customer_email: {
                    type: "string",
                    description: "Customer e-mail (max length: 64)",
                    maxLength: 64
                },
                customer_phone: {
                    type: "string",
                    description: "Customer phone / mobile number (max length: 64)",
                    maxLength: 64
                },
                transaction_status: {
                    type: "string",
                    description: "Transaction status (max length: 18)",
                    maxLength: 18
                }
            },
            required: [],
            additionalProperties: false
        }
    }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "query_transaction") {
        throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const args = request.params.arguments || {};


    // Create form data parameters
    const formData = new URLSearchParams();

    // Add default merchant credentials
    formData.append('MERCHANT', MSU_MERCHANT);
    formData.append('MERCHANTUSER', MSU_MERCHANT_USER);
    formData.append('MERCHANTPASSWORD', MSU_MERCHANT_PASSWORD);

    // Add action parameter
    formData.append('ACTION', 'QUERYTRANSACTION');

    // Add transaction identifier if provided
    if (args.pgtranid) {
        formData.append('PGTRANID', args.pgtranid);
    }

    // Add optional date filters
    if (args.start_date) {
        formData.append('STARTDATE', args.start_date);
    }
    if (args.end_date) {
        formData.append('ENDDATE', args.end_date);
    }

    // Add limit parameter with default value
    const limit = args.limit || '1000';
    formData.append('LIMIT', limit);

    // Add merchant payment ID if provided
    if (args.merchant_payment_id) {
        formData.append('MERCHANTPAYMENTID', args.merchant_payment_id);
    }

    // Add customer parameter if provided
    if (args.customer) {
        formData.append('CUSTOMER', args.customer);
    }

    // Add customer email parameter if provided
    if (args.customer_email) {
        formData.append('CUSTOMEREMAIL', args.customer_email);
    }

    // Add customer name parameter if provided
    if (args.customer_name) {
        formData.append('CUSTOMERNAME', args.customer_name);
    }

    // Add customer phone parameter if provided
    if (args.customer_phone) {
        formData.append('CUSTOMERPHONE', args.customer_phone);
    }

    // Add transaction status parameter if provided
    if (args.transaction_status) {
        formData.append('TRANSACTIONSTATUS', args.transaction_status);
    }

    // Add offset parameter if provided
    if (args.offset) {
        formData.append('OFFSET', args.offset);
    }

    try {
        const response = await fetch(MSU_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MSU API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Enhance response with error code explanations
        const enhancedData = enhanceResponseWithErrorCodes(data);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(enhancedData, null, 2)
            }]
        };

    } catch (error) {
        if (error.message.includes('fetch')) {
            throw new Error(`Network error connecting to MSU API: ${error.message}`);
        }
        throw error;
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();
