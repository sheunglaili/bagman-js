import type { AuthorizerConfig, BagmanConfig, ConfigResolver } from "./types";

export class SecurityContext {

    private authorizer?: AuthorizerConfig;
    private apiKey?: string;
    private apiToken?: string;

    constructor({ apiKey, authorizer }: BagmanConfig) {
        if (!apiKey && !authorizer) {
            throw new Error("Please supply either API Key or Authorizer Config");
        };

        this.apiKey = apiKey;
        this.authorizer = authorizer;
    }

    private async resolve<T = any>(resolver: ConfigResolver<T>): Promise<T> {
        if (resolver instanceof Function) return resolver();
        return resolver;
    }

    isAuthorized(): boolean {
        return !!this.apiKey || !!this.apiToken;
    }

    token(): string {
        if (!this.isAuthorized()) throw new Error("Please authorize client or provide API Key.");
        // priorize api token
        // authorized means either of them exists.
        return this.apiToken! || this.apiKey!; 
    }

    async authorize(): Promise<void> {
        if (!this.authorizer) throw new Error("No Authorizer Config is Provided.");

        const { scheme = "https", port = 80, method = 'GET', host, path, extraHeaders, extraParams, body } = this.authorizer;

        const params = extraParams && await this.resolve(extraParams);
        const url = new URL(`${path}${params ? `?${new URLSearchParams(params).toString()}` : ''}`, `${scheme}://${host}:${port}`);

        if (body && method === 'GET') {
            throw new Error(`Couldn't supply body to a GET Authorize Request. Please check your Authorizer Config.`);
        }

        const response = await fetch(url, {
            method,
            headers: {
                ...(extraHeaders && await this.resolve(extraHeaders))
            },
            ...(body && { body: await this.resolve(body) })
        });

        if (response.status < 200 || response.status > 299) {
            throw new Error("Authorization Failed. Please check config or authorizer endpoint.")
        }

        const { token } = await response.json();

        this.apiToken = token;
    }
}