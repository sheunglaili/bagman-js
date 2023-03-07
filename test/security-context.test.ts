import { afterEach, describe, expect, it, vi } from "vitest";
import { SecurityContext } from "../src/security-context";
import { FetchMockBuilder } from "./utils/fetch";


describe("security context", () => {

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should require either api key or authorizer config", () => {
        expect(() => new SecurityContext({})).toThrowError("Please supply either API Key or Authorizer Config");

        expect(() => new SecurityContext({ apiKey: "dummy-api-key" })).not.toThrowError();
        expect(() => new SecurityContext({
            authorizer: {
                host: 'localhost',
                path: '/'
            }
        })).not.toThrowError();
    });

    it("should return false for `isAuthorized()` when `authorizer` is supplied and `authorize()` is not called", async () => {
        const ctx = new SecurityContext({ authorizer: { host: 'localhost', path: '/' } });

        expect(ctx.isAuthorized()).toEqual(false);

        new FetchMockBuilder()
            .status(200)
            .body({ token: "dummy-token" })
            .mock();

        await ctx.authorize();

        expect(vi.mocked(fetch)).toBeCalledWith(
            new URL('/', 'https://localhost:80'),
            { method: 'GET', headers: {} }
        );

        expect(ctx.isAuthorized()).toEqual(true);
    });

    it("should resolve extra configs when passed in to authorizer config", async () => {
        const ctx = new SecurityContext({
            authorizer: {
                method: 'POST',
                scheme: 'http',
                host: 'localhost',
                port: 123,
                path: '/',
                extraHeaders: () => ({ hello: 'world' }),
                extraParams: () => ({ 'hello': 'world' }),
                body: JSON.stringify({ 'hello': 'world' })
            }
        });

        new FetchMockBuilder()
            .status(200)
            .body({ token: "dummy-token" })
            .mock();

        await ctx.authorize();

        expect(fetch).toBeCalledWith(
            new URL('/?hello=world', `http://localhost:123`),
            {
                method: 'POST',
                headers: {
                    hello: 'world'
                },
                body: JSON.stringify({ hello: 'world' })
            }
        );
    });

    it('should return apiKey as token when provided with API Keys', () => {
        const ctx = new SecurityContext({ apiKey: "dummy-apikey" });

        expect(ctx.isAuthorized()).toEqual(true);
        expect(ctx.token()).toEqual("dummy-apikey");
    });

    it("should throw error when invoke `authorize()` without providing a config", async () => {
        const ctx = new SecurityContext({ apiKey: "dummy-token" });

        await expect(ctx.authorize()).rejects.toThrowError("No Authorizer Config is Provided.")
    });

    it("should throw error when `method` = `GET` and `body` is provided", async () => {
        const ctx = new SecurityContext({
            authorizer: {
                host: "localhost",
                path: '/',
                method: 'GET',
                body: JSON.stringify({})
            }
        });

        expect(ctx.authorize()).rejects.toThrowError("Couldn't supply body to a GET Authorize Request. Please check your Authorizer Config.");
    });

    it("should throw error when authorizer respond with not 2xx status code", async () => {
        const ctx = new SecurityContext({
            authorizer: {
                host: "localhost",
                path: '/',
            }
        });

        new FetchMockBuilder()
            .status(400)
            .body({})
            .mock();

        expect(ctx.authorize()).rejects.toThrowError("Authorization Failed. Please check config or authorizer endpoint.");
    });

    it("should return api key if provided from `token()`", () => {
        const ctx = new SecurityContext({ apiKey: 'dummy-token' });

        expect(ctx.token()).toEqual("dummy-token");
    });

    it("should throw error when `token()` is invoked without passing in apiKey & `authorize()` is not called", () => {
        const ctx = new SecurityContext({
            authorizer: {
                host: "localhost",
                path: '/',
            }
        });

        expect(() => ctx.token()).toThrowError("Please authorize client or provide API Key.");
    });

    it("should return apiToken from `token()` when authorizer is provided & authorize successfully", async () => {
        const ctx = new SecurityContext({
            authorizer: {
                host: "localhost",
                path: '/',
            }
        });

        new FetchMockBuilder()
            .status(200)
            .body({ token: "dummy-token" })
            .mock();

        await ctx.authorize();

        expect(ctx.token()).toEqual("dummy-token");
    });
}) 