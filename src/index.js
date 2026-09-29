#!/usr/bin/env node

import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {CallToolRequestSchema, ListToolsRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import {MSU_ERROR_CODES} from "./error-codes.js";
import {encode} from "@toon-format/toon";

const MSU_API_BASE_URL = process.env.MSU_ENV === "test"
    ? "https://test.merchantsafeunipay.com/msu/api/v2"
    : "https://merchantsafeunipay.com/msu/api/v2";
const MSU_MERCHANT = process.env.MSU_MERCHANT;
const MSU_MERCHANT_USER = process.env.MSU_MERCHANT_USER;
const MSU_MERCHANT_PASSWORD = process.env.MSU_MERCHANT_PASSWORD;

// Function to enhance response with error code explanations
// Returns response with separate error_explanations map for uniform array structure
function enhanceResponseWithErrorCodes(data) {
    if (typeof data === 'object' && data !== null) {
        const errorCodesFound = new Set();
        const enhanced = JSON.parse(JSON.stringify(data)); // Deep clone

        // Collect all unique error codes in the response
        const collectErrorCodes = (obj) => {
            for (const value of Object.values(obj)) {
                if (typeof value === 'string' && value.startsWith('ERR')) {
                    const errorCode = value.match(/ERR\d{5}/)?.[0];
                    if (errorCode && MSU_ERROR_CODES[errorCode]) {
                        errorCodesFound.add(errorCode);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    collectErrorCodes(value);
                }
            }
        };

        collectErrorCodes(enhanced);

        // Normalize transactions array for uniform structure (enables CSV-style TOON)
        // Support both 'transactions' and 'transactionList' field names
        const transactionArrayKey = enhanced.transactions ? 'transactions' :
                                     enhanced.transactionList ? 'transactionList' : null;

        if (transactionArrayKey && Array.isArray(enhanced[transactionArrayKey])) {
            // Collect all unique fields across all transactions
            const allFields = new Set();
            enhanced[transactionArrayKey].forEach(txn => {
                Object.keys(txn).forEach(field => allFields.add(field));
            });

            // Ensure every transaction has all fields (add missing fields as empty string)
            // Normalize nested objects to strings for uniform type
            enhanced[transactionArrayKey] = enhanced[transactionArrayKey].map(txn => {
                const normalized = {};
                allFields.forEach(field => {
                    let value = txn[field] !== undefined ? txn[field] : '';

                    // Convert nested objects to JSON strings for type uniformity
                    if (value !== '' && typeof value === 'object' && value !== null) {
                        value = JSON.stringify(value);
                    }

                    normalized[field] = value;
                });
                return normalized;
            });
        }

        // Normalize cardList array for uniform structure (enables CSV-style TOON)
        if (enhanced.cardList && Array.isArray(enhanced.cardList)) {
            // Collect all unique fields across all cards
            const allFields = new Set();
            enhanced.cardList.forEach(card => {
                Object.keys(card).forEach(field => allFields.add(field));
            });

            // Ensure every card has all fields (add missing fields as empty string)
            // Normalize nested objects to strings for uniform type
            enhanced.cardList = enhanced.cardList.map(card => {
                const normalized = {};
                allFields.forEach(field => {
                    let value = card[field] !== undefined ? card[field] : '';

                    // Convert nested objects to JSON strings for type uniformity
                    if (value !== '' && typeof value === 'object' && value !== null) {
                        value = JSON.stringify(value);
                    }

                    normalized[field] = value;
                });
                return normalized;
            });
        }

        // Build error_explanations map if any error codes found
        if (errorCodesFound.size > 0) {
            const error_explanations = {};
            for (const code of errorCodesFound) {
                error_explanations[code] = MSU_ERROR_CODES[code];
            }

            // Return response with error_explanations at root level
            return {
                ...enhanced,
                error_explanations
            };
        }

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
                    description: "Transaction status (max length: 2). Valid values: 'IP' (İşleniyor/Processing), 'CA' (Vazgeçildi/Abandoned), 'FA' (Başarısız/Failed), 'AP' (Onaylandı/Approved), 'VD' (İptal Edildi/Voided), 'MR' (Kontrol Gerekli/Manual Review), 'PA' (Kapatıldı/Partial Approval), 'WFA' (İlk Onay Bekleniyor/Waiting First Approval), 'WLA' (Son Onay Bekleniyor/Waiting Last Approval), 'RJ' (Reddedildi/Rejected), 'AVD' (Otomatik İptal/Auto Voided), 'ARND' (Otomatik İade/Auto Refunded), 'AFA' (Otomatik Başarısız/Auto Failed)",
                    maxLength: 18
                }
            },
            required: [],
            additionalProperties: false
        }
    },
    {
        name: "query_customer",
        description: "Query customer details from MSU (MerchantSafe Unipay) payment gateway. Returns all information related to the customer specified by CUSTOMER parameter sent in request.",
        inputSchema: {
            type: "object",
            properties: {
                customer: {
                    type: "string",
                    description: "The Merchant System ID for customer. It must be unique within a Merchant (max length: 128)",
                    maxLength: 128
                },
                customer_name: {
                    type: "string",
                    description: "Name of the Customer (max length: 128)",
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
                }
            },
            required: [],
            additionalProperties: false
        }
    },
    {
        name: "query_card",
        description: "Query saved card tokens from MSU (MerchantSafe Unipay) payment gateway. Returns all card tokens saved for a particular cardholder (customer) or card details based on given token value. Response includes card information like brand, type, last 4 digits, expiry date, and issuer details.",
        inputSchema: {
            type: "object",
            properties: {
                cardtoken: {
                    type: "string",
                    description: "Numeric value replacing card number & expiry date. Required when none of the other card information are provided (max length: 64)",
                    maxLength: 64
                },
                cardsavename: {
                    type: "string",
                    description: "Given name for the saved card (max length: 255)",
                    maxLength: 255
                },
                customer: {
                    type: "string",
                    description: "The Merchant System ID for customer. It must be unique within a Merchant (max length: 128)",
                    maxLength: 128
                },
                forgroup: {
                    type: "string",
                    description: "Enables queries using cards saved by other merchants in the same Card Sharing Group (max length: 3, default: 'no')",
                    maxLength: 3
                },
                offset: {
                    type: "string",
                    description: "Specifies the number from which cards will start for pagination (max length: 4, default: '0')",
                    maxLength: 4
                },
                limit: {
                    type: "string",
                    description: "The maximum number of cards in response (max length: 4, default: '1000')",
                    maxLength: 4
                },
                dealercode: {
                    type: "string",
                    description: "The Dealer Code (max length: 32)",
                    maxLength: 32
                },
                initiatormerchantbusinessid: {
                    type: "string",
                    description: "Initiator merchant business ID (max length: 16)",
                    maxLength: 16
                },
                start_date: {
                    type: "string",
                    description: "Start date for card query in dd-MM-yyyy HH:mm format (max length: 16)"
                },
                end_date: {
                    type: "string",
                    description: "End date for card query in dd-MM-yyyy HH:mm format (max length: 16)"
                },
                encryptedpan: {
                    type: "string",
                    description: "Encrypted PAN (max length: 1024)",
                    maxLength: 1024
                }
            },
            required: [],
            additionalProperties: false
        }
    },
    {
        name: "query_card_details",
        description: "Query card details for a specific session from MSU (MerchantSafe Unipay) payment gateway. Returns information about cards saved with the given session token. Response includes card count and detailed card information (brand, type, last 4 digits, expiry, issuer).",
        inputSchema: {
            type: "object",
            properties: {
                sessiontoken: {
                    type: "string",
                    description: "Unique session token containing transaction values (max length: 48)",
                    maxLength: 48
                }
            },
            required: ["sessiontoken"],
            additionalProperties: false
        }
    },
    {
        name: "query_session",
        description: "Query session information from MSU (MerchantSafe Unipay) payment gateway. Returns merchant, customer, and session details for a valid session token. Response includes session status, amounts, currency, timestamps, merchant information, and customer details.",
        inputSchema: {
            type: "object",
            properties: {
                sessiontoken: {
                    type: "string",
                    description: "Unique session token containing transaction values (max length: 48)",
                    maxLength: 48
                }
            },
            required: ["sessiontoken"],
            additionalProperties: false
        }
    }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "query_transaction" && request.params.name !== "query_customer" && request.params.name !== "query_card" && request.params.name !== "query_card_details" && request.params.name !== "query_session") {
        throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const args = request.params.arguments || {};


    // Create form data parameters
    const formData = new URLSearchParams();

    // Add default merchant credentials
    formData.append('MERCHANT', MSU_MERCHANT);
    formData.append('MERCHANTUSER', MSU_MERCHANT_USER);
    formData.append('MERCHANTPASSWORD', MSU_MERCHANT_PASSWORD);

    if (request.params.name === "query_transaction") {
        // Add action parameter for transaction query
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

        // Add transaction status parameter if provided
        if (args.transaction_status) {
            formData.append('TRANSACTIONSTATUS', args.transaction_status);
        }

        // Add offset parameter if provided
        if (args.offset) {
            formData.append('OFFSET', args.offset);
        }
    } else if (request.params.name === "query_customer") {
        // Add action parameter for customer query
        formData.append('ACTION', 'QUERYCUSTOMER');
    } else if (request.params.name === "query_card") {
        // Add action parameter for card query
        formData.append('ACTION', 'QUERYCARD');

        // Add card token if provided
        if (args.cardtoken) {
            formData.append('CARDTOKEN', args.cardtoken);
        }

        // Add card save name if provided
        if (args.cardsavename) {
            formData.append('CARDSAVENAME', args.cardsavename);
        }

        // Add forgroup parameter with default value
        const forgroup = args.forgroup || 'no';
        formData.append('FORGROUP', forgroup);

        // Add offset parameter with default value
        const offset = args.offset || '0';
        formData.append('OFFSET', offset);

        // Add limit parameter with default value
        const limit = args.limit || '1000';
        formData.append('LIMIT', limit);

        // Add dealer code if provided
        if (args.dealercode) {
            formData.append('DEALERCODE', args.dealercode);
        }

        // Add initiator merchant business ID if provided
        if (args.initiatormerchantbusinessid) {
            formData.append('INITIATORMERCHANTBUSINESSID', args.initiatormerchantbusinessid);
        }

        // Add start date if provided
        if (args.start_date) {
            formData.append('STARTDATE', args.start_date);
        }

        // Add end date if provided
        if (args.end_date) {
            formData.append('ENDDATE', args.end_date);
        }

        // Add encrypted PAN if provided
        if (args.encryptedpan) {
            formData.append('ENCRYPTEDPAN', args.encryptedpan);
        }
    } else if (request.params.name === "query_card_details") {
        // Add action parameter for card details query
        formData.append('ACTION', 'QUERYCARDDETAILS');

        // Add session token (required)
        if (args.sessiontoken) {
            formData.append('SESSIONTOKEN', args.sessiontoken);
        }
    } else if (request.params.name === "query_session") {
        // Add action parameter for session query
        formData.append('ACTION', 'QUERYSESSION');

        // Add session token (required)
        if (args.sessiontoken) {
            formData.append('SESSIONTOKEN', args.sessiontoken);
        }
    }

    // Add customer parameters only for tools that support them
    // query_transaction, query_customer, and query_card support customer parameters
    if (request.params.name === "query_transaction" ||
        request.params.name === "query_customer" ||
        request.params.name === "query_card") {

        if (args.customer) {
            formData.append('CUSTOMER', args.customer);
        }

        if (args.customer_email) {
            formData.append('CUSTOMEREMAIL', args.customer_email);
        }

        if (args.customer_name) {
            formData.append('CUSTOMERNAME', args.customer_name);
        }

        if (args.customer_phone) {
            formData.append('CUSTOMERPHONE', args.customer_phone);
        }
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
                text: encode(enhancedData)
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
