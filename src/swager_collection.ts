import { SwaggerParser } from "./swagger_parser.js";


export class SwaggerCollection {
    constructor(private readonly swaggers: { url: string, name: string, schema: any }[]) {
        this.swaggers = swaggers;
    }

    listSwaggers() {
        return this.swaggers.map((swagger) => this.mapSwagger(swagger));
    }
    
    getSwagger(id: string) {
        let result = this.swaggers.find((swagger) => swagger.name === id);
        if (result) {
            return this.mapSwagger(result);
        }
        return null;
    }

    private mapSwagger(swagger: any) {
        return {
            id: swagger.name,
            url: swagger.url,
            name: swagger.schema.info.title,
            instance: new SwaggerParser(swagger.name, swagger.schema)
        };
    }
}