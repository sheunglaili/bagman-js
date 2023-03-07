import { vi } from "vitest";

global.fetch = vi.fn();

global.Headers = vi.fn();

export class FetchMockBuilder {

    private _url?: string;
    private _method?: string;
    private _status?: number;
    private _body?: string;

    url(url: string) {
        this._url = url;
        return this;
    }

    method(method: string) {
        this._method = method;
        return this;
    }

    status(status: number) {
        this._status = status;
        return this;
    }

    body(body: any) {
        this._body = body;
        return this;
    }

    mock() {
        if (!this._status) throw new Error("Missing expected status code.");
        if (!this.method) throw new Error("Missing expected method.");

        vi.mocked(fetch).mockResolvedValue({
            headers: new Headers(),
            ok: this._status < 200 || this._status > 299 ,
            redirected: false,
            status: this._status,
            statusText: "",
            type: "default",
            url: this._url || "",
            clone: vi.fn(),
            body: null, // use the following helper method instead
            bodyUsed: false,
            arrayBuffer: function (): Promise<ArrayBuffer> {
                throw new Error("Function not implemented.");
            },
            blob: function (): Promise<Blob> {
                throw new Error("Function not implemented.");
            },
            formData: function (): Promise<FormData> {
                throw new Error("Function not implemented.");
            },
            json: async (): Promise<any> => {
                if (!this._body) {
                    throw new Error("Missing expected response.")
                }
                return this._body
            },
            text: async (): Promise<string> => {
                if (!this._body) {
                    throw new Error("Missing expected response.")
                }
                return JSON.stringify(this._body);
            }
        });
    }
};