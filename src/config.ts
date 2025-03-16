import { z } from "zod";
import fs from "fs";
export const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type Literal = z.infer<typeof literalSchema>;
export type Json = Literal | { [key: string]: Json } | Json[];

export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);
export type JsonSchema = z.infer<typeof jsonSchema>;

export const ConfigSchema = z.object({
    endpoints: z.array(z.object({
        name: z.string(),
        url: z.string().url(),
        schema: jsonSchema
    }))
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(configPath: string): Promise<Config> {
    try {
        const configFile = fs.readFileSync(configPath, 'utf8');
        const parsedConfig = JSON.parse(configFile);
        const endpointsWithSchema = await Promise.all(parsedConfig.endpoints
            .map(async ({url, name}: {url: string, name: string}) => {
                const response = await fetch(url);
                const schema = await response.json();
                return { url, name, schema };
            }));
        return ConfigSchema.parse({ endpoints: endpointsWithSchema });
    } catch (error) {
        console.error(`Error loading config from ${configPath}:`, error);
        process.exit(1);
    }
}
