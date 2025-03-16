import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
    name: "swagger",
    version: "1.0.0",
});

server.tool(
    "list-swaggers",
    "List all connected swagger endpoints",
    async () => {
        return {
            content: [
                {
                    type: "text",
                    text: "Hello, world!"
                }
            ]
        }
    }
)

server.tool(
    "list-endpoints",
    "List all available endpoints with a short description. If swagger is provided, only endpoints from that swagger will be listed.",
    {
        swagger: z.string().optional().describe("Swagger id returned by list-swaggers")
    },
    async () => {
        return {
            content: [
                {
                    type: "text",
                    text: "Hello, world!"
                }
            ]
        }
    }
)

server.tool(
    "get-endpoints",
    "Get detailed information about specific endpoints",
    {
        endpointIds: z.array(z.string()).describe("List of endpoint IDs to retrieve details for. Endpoint ids can be found in the list-endpoints tool.")
    },
    async ({ endpointIds }) => {
        return {
            content: [
                {
                    type: "text",
                    text: `Retrieved details for endpoints: ${endpointIds.join(", ")}`
                }
            ]
        }
    }
)

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Swagger MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
