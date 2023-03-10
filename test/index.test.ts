import { vi, it, expect, describe, beforeEach, afterEach } from "vitest";

import { Bagman, GlobalEvent } from "../src";
import { Channel } from "../src/channel";
import { SecurityContext } from "../src/security-context";
import { io } from "socket.io-client";

vi.mock("../src/security-context", () => {
    const SecurityContext = vi.fn()
    SecurityContext.prototype.isAuthorized = vi.fn();
    SecurityContext.prototype.token = vi.fn();
    SecurityContext.prototype.authorize = vi.fn();
    return { SecurityContext }
});


vi.mock("socket.io-client", () => {
    const mockSocket = {
        connected: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
        io: {
            on: vi.fn(),
            opts: {},
            engine: {
                transport: {
                    on: vi.fn(),
                    pollXhr: {
                        xhr: {
                            getResponseHeader: vi.fn()
                        }
                    }
                }
            }
        }
    };
    return {
        io: vi.fn(() => mockSocket)
    };
});

describe("Bagman", () => {
    let socket: any;

    beforeEach(() => {
        socket = io();
    });

    afterEach(() => {
        vi.clearAllMocks();
        socket.io.opts = {};
    })

    it('should set extra headers when there is a cookie header', () => {

        new Bagman({ apiKey: "dummy-token" });

        const cookieHeader = ['server_id=abcdef'];
        socket.io.engine.transport.pollXhr.xhr.getResponseHeader.mockReturnValue(cookieHeader);

        const openCallback = socket.io.on.mock.calls[0][1];
        openCallback();

        const pollCompleteCallback = socket.io.engine.transport.on.mock.calls[0][1];
        pollCompleteCallback();

        expect(socket.io.opts.extraHeaders).toEqual({ cookie: 'server_id=abcdef' });
    });

    it('should not set extra headers when there is no cookie header', () => {
        new Bagman({ apiKey: "dummy-token" });

        socket.io.engine.transport.pollXhr.xhr.getResponseHeader.mockReturnValue(null);

        const openCallback = socket.io.on.mock.calls[0][1];
        openCallback();

        const pollCompleteCallback = socket.io.engine.transport.on.mock.calls[0][1];
        pollCompleteCallback();

        expect(socket.io.opts.extraHeaders).toBeUndefined();
    });

    it("subscribes to a channel", () => {
        vi.mocked(SecurityContext.prototype.isAuthorized).mockReturnValue(true);

        const channel = "test-channel";
        const ack = { status: "ok" };
        socket.emit.mockImplementation((event, data, cb) => cb(ack));

        const bagman = new Bagman({ url: "http://test-url.com", apiKey: "dummy-token" });
        const result = bagman.subscribe(channel);

        expect(socket.emit).toHaveBeenCalledWith("client:subscribe", { channel }, expect.any(Function));
        expect(result).resolves.toEqual(new Channel(socket, channel));
    });

    it("rejects when subscription fails", () => {
        const channel = "test-channel";
        const ack = { status: "error", message: "subscription failed" };
        socket.emit.mockImplementation((event, data, cb) => cb(ack));

        const bagman = new Bagman({ url: "http://test-url.com", apiKey: "dummy-token" });
        const result = bagman.subscribe(channel);

        expect(socket.emit).toHaveBeenCalledWith("client:subscribe", { channel }, expect.any(Function));
        expect(result).rejects.toEqual(new Error("subscription failed"));
    });

    it("defaults to http://localhost:8080 when no url is provided", () => {
        new Bagman({ apiKey: "dummy-token" });

        expect(vi.mocked(io)).toHaveBeenCalledWith("http://localhost:8080", {
            transports: ["polling", "websocket"],
            rememberUpgrade: false,
            autoConnect: false,
        })
    })

    it.each<GlobalEvent>(["connect", "connect_error", "disconnecting", "disconnect"])("listens to global event: %s", (event) => {
        const bagman = new Bagman({ apiKey: "dummy-token" });
        const cb = vi.fn();

        bagman.listen(event, cb);

        expect(socket.on).toHaveBeenCalledWith(event, cb);
    });

    it("throw errors when listening to non-exist global event", () => {
        const bagman = new Bagman({ apiKey: "dummy-token" });

        // @ts-expect-error
        expect(() => bagman.listen("not-permitted-event", () => { })).toThrowError();
    });

    it("should set api key as header is api key is passed in", async () => {
        vi.mocked(SecurityContext.prototype.isAuthorized).mockReturnValue(true);
        vi.mocked(SecurityContext.prototype.token).mockReturnValue("dummy-token");

        new Bagman({ apiKey: "dummy-token" });

        expect(socket.connect).toBeCalled();
        expect(socket.io.opts.extraHeaders).toEqual({
            'x-api-key': 'dummy-token'
        });
    })

    it("should set socket header with x-api-key if authorization success", async () => {
        vi.mocked(SecurityContext.prototype.isAuthorized).mockReturnValueOnce(false);
        vi.mocked(SecurityContext.prototype.authorize).mockResolvedValue();
        vi.mocked(SecurityContext.prototype.isAuthorized).mockReturnValueOnce(true);
        vi.mocked(SecurityContext.prototype.token).mockReturnValue("dummy-token");

        const bagman = new Bagman({
            authorizer: {
                host: 'localhost',
                path: '/'
            }
        });

        await bagman.authorize();

        expect(socket.connect).toBeCalled();
        expect(socket.io.opts.extraHeaders).toEqual({
            'x-api-key': 'dummy-token'
        });
    })

    it("should only disconnect socket if it's connected when invoke `close()`", () => {
        socket.connected = true;

        const bagman = new Bagman({
            authorizer: {
                host: 'localhost',
                path: '/'
            }
        });

        bagman.close();

        expect(socket.disconnect).toBeCalled();
    });

    it("should throw error when subscribing without being authoirzed", async () => {
        vi.mocked(SecurityContext.prototype.isAuthorized).mockReturnValue(false);

        const bagman = new Bagman({
            authorizer: {
                host: 'localhost',
                path: '/'
            }
        });

        await expect(bagman.subscribe("test-channel")).rejects.toThrowError("Unauthorized. Please authorize client and proceed again.");
    })
});