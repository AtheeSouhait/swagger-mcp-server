import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SwaggerCollection } from "./swager_collection.js";
import { Endpoint } from "./swagger_parser.js";

export class SwaggerMcpServer {
    private server: McpServer;

    constructor(private readonly swaggerCollection: SwaggerCollection) {
        this.server = new McpServer({
            name: "swagger",
            version: "1.0.0",
        });

        this.server.tool(
            "list-swaggers",
            "List all connected swagger endpoints",
            async () => {
                const swaggers = this.swaggerCollection.listSwaggers();

                let result = "List of available swaggers (id | name | url):\n";
                for (const swagger of swaggers) {
                    result += `${swagger.id} | ${swagger.name} | ${swagger.url}\n`;
                }
    
                return {
                    content: [
                        {
                            type: "text",
                            text: result
                        }
                    ]
                }
            }
        )
        
        this.server.tool(
            "list-endpoints",
            "List all available endpoints with a short description. " +
                "If swagger is provided, only endpoints from that swagger will be listed.",
            {
                swagger: z.string().optional().describe("Swagger id returned by list-swaggers")
            },
            async ({ swagger }) => {
                let swaggers = swagger
                    ? [swagger]
                    : this.swaggerCollection.listSwaggers().map((s) => s.id);

                let endpoints: Array<Endpoint> = [];
                for (const swaggerId of swaggers) {
                    const swagger = this.swaggerCollection.getSwagger(swaggerId);
                    if (swagger) {
                        endpoints.push(...swagger.instance.listEndpoints());
                    }
                }

                let result = "List of available endpoints (endpointId | method | path | description):\n";
                for (const endpoint of endpoints) {
                    const mergedText = endpoint.summary ? `${endpoint.summary}${endpoint.summary.endsWith('.') ? '' : '.'} ${endpoint.description}`.trim() : endpoint.description;

                    result += [
                        `${endpoint.swaggerName}-${endpoint.operationId}`,
                        endpoint.method.toUpperCase() + ' ' + endpoint.path,
                        mergedText
                    ].join(' | ') + '\n';
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: result
                        }
                    ]
                }
            }
        )
        
        this.server.tool(
            "get-endpoints",
            "Get detailed information about specific endpoints",
            {
                endpointIds: z.array(z.string())
                    .describe("List of endpoint IDs to retrieve details for. " +
                        "Endpoint ids can be found in the list-endpoints tool.")
            },
            async ({ endpointIds }) => {
                let result = [];
                
                for (const endpointId of endpointIds) {
                    const lastHyphenIndex = endpointId.lastIndexOf('-');
                    
                    if (lastHyphenIndex === -1) {
                        result.push(`Invalid endpoint ID format: ${endpointId}`);
                        continue;
                    }
                    
                    const swaggerName = endpointId.substring(0, lastHyphenIndex);
                    const operationId = endpointId.substring(lastHyphenIndex + 1);
                    
                    if (!swaggerName || !operationId) {
                        result.push(`Invalid endpoint ID format: ${endpointId}`);
                        continue;
                    }
                    
                    const swagger = this.swaggerCollection.getSwagger(swaggerName);
                    if (!swagger) {
                        result.push(`Swagger not found: ${swaggerName} for endpoint ${endpointId}`);
                        continue;
                    }
                    
                    const endpoints = swagger.instance.listEndpoints();
                    const endpoint = Array.from(endpoints).find(e => e.operationId === operationId);
                    
                    if (!endpoint) {
                        result.push(`Endpoint not found: ${operationId} in swagger ${swaggerName}`);
                        continue;
                    }
                    
                    result.push(this.formatEndpointDetails(endpoint));
                }
                
                return {
                    content: [
                        {
                            type: "text",
                            text: result.join("\n\n---\n\n") || "No endpoint details found."
                        }
                    ]
                }
            }
        )
    }
    
    private formatEndpointDetails(endpoint: Endpoint): string {
        let result = "";
        
        result += `## ${endpoint.operationId} ${endpoint.summary}\n`;
        result += `### URL: ${endpoint.method.toUpperCase()} ${endpoint.path}\n`;
        
        if (endpoint.description) {
            result += `### Description\n${endpoint.description}\n`;
        }
        
        const pathParams = endpoint.parameters.filter(p => p.in === 'path');
        const queryParams = endpoint.parameters.filter(p => p.in === 'query');
        const bodyParams = endpoint.parameters.filter(p => p.in === 'body');
        const otherParams = endpoint.parameters.filter(p => !['path', 'query', 'body'].includes(p.in));
        
        if (pathParams.length > 0) {
            result += `### Path Parameters\n`;
            for (const param of pathParams) {
                result += `- \`${param.name}\` (${param.type}${param.required ? ', required' : ''}): ${param.description}\n`;
            }
            result += `\n`;
        }
        
        if (queryParams.length > 0) {
            result += `### Query Parameters\n`;
            for (const param of queryParams) {
                result += `- \`${param.name}\` (${param.type}${param.required ? ', required' : ''}): ${param.description}\n`;
            }
            result += `\n`;
        }
        
        if (bodyParams.length > 0) {
            result += `### Body Parameters\n`;
            for (const param of bodyParams) {
                result += `- \`${param.name}\` (${param.type}${param.required ? ', required' : ''}): ${param.description}\n`;
            }
            result += `\n`;
        }
        
        if (otherParams.length > 0) {
            result += `### Other Parameters\n`;
            for (const param of otherParams) {
                result += `- \`${param.name}\` (${param.in}, ${param.type}${param.required ? ', required' : ''}): ${param.description}\n`;
            }
            result += `\n`;
        }
        
        let exampleUrl = endpoint.path;
        
        for (const param of pathParams) {
            exampleUrl = exampleUrl.replace(`{${param.name}}`, param.example || `{${param.name}}`);
        }
        
        if (queryParams.length > 0) {
            exampleUrl += '?';
            exampleUrl += queryParams
                .map(p => `${p.name}=${encodeURIComponent(p.example || `{${p.name}}`)}`)
                .join('&');
        }
        
        result += `### Example Request\n`;
        
        result += "```http\n";
        result += `${endpoint.method.toUpperCase()} ${exampleUrl}\n`;
        
        const hasRequestBody = bodyParams.length > 0;
             
        if (hasRequestBody) {
            result += "Content-Type: application/json\n";
        }
        
        for (const param of otherParams) {
            if (param.in === 'header') {
                result += `${param.name}: ${param.example || 'example-value'}\n`;
            }
        }
        
        if (hasRequestBody) {
            result += "\n";
            result += JSON.stringify(endpoint.requestBodyExample, null, 2);
        }
        
        result += "\n```\n\n";
        
        result += `### Example Response\n`;
        
        result += "```http\n";
        result += "HTTP/2 200 OK\n";
        result += "Content-Type: application/json\n\n";
        result += JSON.stringify(endpoint.successExampleResponse, null, 2);
        result += "\n```\n\n";
        
        result += `### Error Response Example\n`;
        result += "```http\n";
        result += "HTTP/2 400 Bad Request\n";
        result += "Content-Type: application/json\n\n";
        result += JSON.stringify(endpoint.errorExampleResponse, null, 2);
        result += "\n```";
        
        return result;
    }
    
    async serve() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Swagger MCP Server running on stdio");
    }
}