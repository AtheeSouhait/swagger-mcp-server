# Swagger MCP Server

A Model Context Protocol server for Swagger/OpenAPI endpoints. This tool allows you to expose Swagger-defined APIs through the Model Context Protocol, making them accessible to AI agents.

## Installation

You can install the package globally:

```bash
npm install -g swagger-mcp-server
```

Or use it directly with npx:

```bash
npx swagger-mcp-server <config-file>
```

## Usage

1. Create a configuration file (JSON) that defines the Swagger endpoints you want to expose:

```json
{
  "endpoints": [
    {
      "name": "example-api",
      "url": "https://example.com/api/swagger.json"
    }
  ]
}
```

2. Run the server:

```bash
swagger-mcp-server config.json
```

Or with npx:

```bash
npx swagger-mcp-server config.json
```

## Configuration Options

The configuration file supports the following options:

- `endpoints`: An array of Swagger endpoints to expose
  - `name`: A unique identifier for the endpoint
  - `url`: URL to the Swagger/OpenAPI JSON definition

## Development

To build the project:

```bash
npm run build
```

To run locally:

```bash
npm run run
```

## License

ISC