/**
 * FlowPay MCP Server
 * Exposes FlowPay database and services to AI Agents.
 * Monitored with Sentry for full visibility.
 */
import { createRequire } from "node:module";
if (typeof require === "undefined") {
    globalThis.require = createRequire(import.meta.url);
}
import * as Sentry from "@sentry/astro";
// Note: You must install @modelcontextprotocol/sdk to use this
// npm install @modelcontextprotocol/sdk
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    listAllOrders,
    getOrder,
    listUsers,
    getUserByEmail,
    getPaymentButton
} from "../src/services/database/sqlite.mjs";

// 1. Initialize Sentry for this process
// We use the same configuration provided by Sentry for MCP monitoring
Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Tracing must be enabled for MCP monitoring to work
    tracesSampleRate: 1.0,

    // Enable PII for better debugging in MCP interactions
    sendDefaultPii: true,

    environment: process.env.NODE_ENV || "production",
    release: process.env.SENTRY_RELEASE || "flowpay@1.0.1",
});

// 2. Wrap the MCP server with Sentry (The core request)
// This will automatically capture spans for all MCP server interactions.
const server = Sentry.wrapMcpServerWithSentry(new McpServer({
    name: "flowpay-mcp",
    version: "1.0.0",
}));

/**
 * Tool: list_orders
 * Exposes recent transactions from the FlowPay database.
 */
server.tool(
    "list_orders",
    { limit: { type: "number", description: "Number of orders to return (default 50)" } },
    async ({ limit }) => {
        try {
            const orders = listAllOrders(limit || 50);
            return {
                content: [{ type: "text", text: JSON.stringify(orders, null, 2) }]
            };
        } catch (error) {
            Sentry.captureException(error);
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true
            };
        }
    }
);

/**
 * Tool: get_order
 * Retrieves specific order details by its charge ID.
 */
server.tool(
    "get_order",
    { charge_id: { type: "string", description: "The Woovi charge_id (e.g., from a listing)" } },
    async ({ charge_id }) => {
        try {
            const order = getOrder(charge_id);
            if (!order) {
                return {
                    content: [{ type: "text", text: `Order with charge_id ${charge_id} not found.` }],
                    isError: true
                };
            }
            return {
                content: [{ type: "text", text: JSON.stringify(order, null, 2) }]
            };
        } catch (error) {
            Sentry.captureException(error);
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true
            };
        }
    }
);

/**
 * Tool: list_merchants
 * Lists registered merchants and their status.
 */
server.tool(
    "list_merchants",
    { status: { type: "string", description: "Filter by status (PENDING_APPROVAL, APPROVED, REJECTED)" } },
    async ({ status }) => {
        try {
            const users = listUsers(status);
            return {
                content: [{ type: "text", text: JSON.stringify(users, null, 2) }]
            };
        } catch (error) {
            Sentry.captureException(error);
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true
            };
        }
    }
);

// --- Server Startup ---

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 FlowPay MCP Server running on stdio");
}

run().catch((error) => {
    Sentry.captureException(error);
    console.error("Fatal error in MCP server:", error);
    process.exit(1);
});
