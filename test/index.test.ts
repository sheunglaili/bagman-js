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
        emitWithAck: vi.fn(),
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

    it("subscribes to a channel", async () => {
        vi.mocked(SecurityContext.prototype.isAuthorized).mockReturnValue(true);

        const channel = "test-channel";
        const ack = { status: "ok" };
        socket.emitWithAck.mockResolvedValue(ack);

        const bagman = new Bagman({ url: "http://test-url.com", apiKey: "dummy-token" });
        const result = bagman.subscribe(channel);

        await expect(result).resolves.toEqual(new Channel(socket, channel));
        expect(socket.emitWithAck).toHaveBeenCalledWith("client:subscribe", { channel });
    });

    it("rejects when subscription fails", async () => {
        const channel = "test-channel";
        const ack = { status: "error", message: "subscription failed" };
        socket.emitWithAck.mockResolvedValue(ack);

        const bagman = new Bagman({ url: "http://test-url.com", apiKey: "dummy-token" });
        const result = bagman.subscribe(channel);

        await expect(result).rejects.toThrowError("subscription failed");
        expect(socket.emitWithAck).toHaveBeenCalledWith("client:subscribe", { channel });
    });

    it("defaults to http://localhost:8080 when no url is provided", () => {
        new Bagman({ apiKey: "dummy-token" });

        expect(vi.mocked(io)).toHaveBeenCalledWith("http://localhost:8080", {
            transports: ["websocket"],
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

    it("should set api key in query if api key is passed in", async () => {
        vi.mocked(SecurityContext.prototype.isAuthorized).mockReturnValue(true);
        vi.mocked(SecurityContext.prototype.token).mockReturnValue("dummy-token");

        new Bagman({ apiKey: "dummy-token" });

        expect(socket.connect).toBeCalled();
        expect(socket.auth).toEqual({
            'apiKey': 'dummy-token'
        });
    })

    it("should set socket query with apiKey if authorization success", async () => {
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
        expect(socket.auth).toEqual({
            'apiKey': 'dummy-token'
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