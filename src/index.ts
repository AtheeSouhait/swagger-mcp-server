import { Config, loadConfig } from './config.js';
import { SwaggerCollection } from "./swager_collection.js";
import { SwaggerMcpServer } from "./swagger_mcp_server.js";


let config: Config;

async function main() {
    const args = process.argv.slice(2);

    if (args.length > 0) {
        const configPath = args[0];
        console.error(`Loading configuration from: ${configPath}`);
        config = await loadConfig(configPath);
        console.error(`Loaded ${config.endpoints.length} endpoints from config`);
    } else {
        console.error("No config file provided. Exiting.");
        process.exit(1);
    }

    const swaggerCollection = new SwaggerCollection(config.endpoints);
    const swaggerMcpServer = new SwaggerMcpServer(swaggerCollection);

    await swaggerMcpServer.serve();
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
