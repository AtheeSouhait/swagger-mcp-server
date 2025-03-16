import { JsonSchema } from "./config.js";

export type Parameter = {
    name: string;
    in: string; // 'path', 'query', 'header', 'body', etc.
    type: string;
    description: string;
    required: boolean;
    example?: string;
}

export type Endpoint = {
    swaggerName: string;
    path: string;
    operationId: string;
    method: string;
    summary: string;
    description: string;
    parameters: Parameter[];
    requestBodyExample: JsonSchema;
    successExampleResponse: JsonSchema;
    errorExampleResponse: JsonSchema;
}

export class SwaggerParser {
    constructor(private readonly name: string, private readonly schema: JsonSchema) {
    }
    
    private extractParameters(operation: any): Parameter[] {
        const parameters: Parameter[] = [];
        if (operation.parameters) {
            for (const param of operation.parameters) {
                parameters.push({
                    name: param.name,
                    in: param.in || 'query', // Default to query if not specified
                    type: param.schema?.type || param.type || 'string',
                    description: param.description || '',
                    required: param.required || false,
                    example: param.example || this.generateExampleForType(param.schema?.type || param.type || 'string')
                });
            }
        }
        return parameters;
    }
    
    private generateExampleForType(type: string): string {
        switch (type) {
            case 'string': return 'example_string';
            case 'integer': return '123';
            case 'number': return '123.45';
            case 'boolean': return 'true';
            default: return '';
        }
    }
    
    private generateSampleFromSchema(schema: any): any {
        if (!schema) return {};
        
        if (schema.$ref) {
            const refPath = schema.$ref.replace('#/components/schemas/', '');
            const schemaObj = this.schema as Record<string, any>;
            if (schemaObj?.components?.schemas?.[refPath]) {
                return this.generateSampleFromSchema(schemaObj.components.schemas[refPath]);
            }
            return {};
        }
        
        switch (schema.type) {
            case 'object':
                const result: Record<string, any> = {};
                if (schema.properties) {
                    for (const propName in schema.properties) {
                        result[propName] = this.generateSampleFromSchema(schema.properties[propName]);
                    }
                }
                return result;
                
            case 'array':
                if (schema.items) {
                    return [this.generateSampleFromSchema(schema.items)];
                }
                return [];
                
            case 'string':
                if (schema.enum && schema.enum.length > 0) {
                    return schema.enum[0];
                }
                if (schema.format === 'date-time') return new Date().toISOString();
                if (schema.format === 'date') return new Date().toISOString().split('T')[0];
                if (schema.format === 'email') return 'user@example.com';
                if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
                return 'string';
                
            case 'number':
            case 'integer':
                return 0;
                
            case 'boolean':
                return false;
                
            case 'null':
                return null;
                
            default:
                if (schema.oneOf && schema.oneOf.length > 0) {
                    return this.generateSampleFromSchema(schema.oneOf[0]);
                }
                if (schema.anyOf && schema.anyOf.length > 0) {
                    return this.generateSampleFromSchema(schema.anyOf[0]);
                }
                if (schema.allOf && schema.allOf.length > 0) {
                    let result = {};
                    for (const subSchema of schema.allOf) {
                        result = { ...result, ...this.generateSampleFromSchema(subSchema) };
                    }
                    return result;
                }
                return {};
        }
    }
    
    private extractRequestBodyExample(operation: any): JsonSchema {
        if (operation.requestBody && operation.requestBody.content) {
            const content = operation.requestBody.content['application/json'];
            
            if (content) {
                if (content.example) {
                    return content.example;
                }
                
                if (content.schema && content.schema.example) {
                    return content.schema.example;
                }
                
                if (content.schema) {
                    return this.generateSampleFromSchema(content.schema);
                }
            }
        }
        
        return {};
    }
    
    private resolveSuccessExampleResponse(operation: any): JsonSchema {
        if (operation.responses && operation.responses['200']) {
            const successResponse = operation.responses['200'];
            
            if (successResponse.content && successResponse.content['application/json']) {
                const content = successResponse.content['application/json'];
                
                if (content.example) {
                    return content.example;
                } 
                
                if (content.schema && content.schema.example) {
                    return content.schema.example;
                }
                
                if (content.schema) {
                    return this.generateSampleFromSchema(content.schema);
                }
            }
        }
        
        return {};
    }
    
    private resolveErrorExampleResponse(operation: any): JsonSchema {
        if (operation.responses) {
            for (const code in operation.responses) {
                const codeNum = parseInt(code, 10);
                if (!isNaN(codeNum) && Math.floor(codeNum / 100) >= 4) {
                    const errorResponse = operation.responses[code];
                    
                    if (errorResponse.content && errorResponse.content['application/json']) {
                        const content = errorResponse.content['application/json'];
                        
                        if (content.example) {
                            return content.example;
                        } 
                        
                        if (content.schema && content.schema.example) {
                            return content.schema.example;
                        }
                        
                        if (content.schema) {
                            return this.generateSampleFromSchema(content.schema);
                        }
                    }
                }
            }
        }
        
        return {
            error: {
                code: 400,
                message: "Bad Request"
            }
        };
    }
    
    public listEndpoints(): Iterable<Endpoint> {
        const endpoints: Endpoint[] = [];
        
        const schemaObj = this.schema as Record<string, any>;
        const paths = schemaObj?.paths || {};
        
        for (const path in paths) {
            const pathItem = paths[path];
            
            for (const method in pathItem) {
                if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
                    const operation = pathItem[method];
                    
                    endpoints.push({
                        swaggerName: this.name,
                        path,
                        operationId: operation.operationId || `${method}${path.replace(/\//g, '_')}`,
                        method,
                        summary: operation.summary || '',
                        description: operation.description || '',
                        parameters: this.extractParameters(operation),
                        requestBodyExample: this.extractRequestBodyExample(operation),
                        successExampleResponse: this.resolveSuccessExampleResponse(operation),
                        errorExampleResponse: this.resolveErrorExampleResponse(operation)
                    });
                }
            }
        }
        
        return endpoints;
    }
}
