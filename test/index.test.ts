import { vi, it, expect, describe, beforeEach, afterEach } from "vitest";

import { Bagman } from "../src";
import { Channel } from "../src/channel";
import { io } from "socket.io-client";

vi.mock("socket.io-client", () => {
    const mockSocket = {
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
        new Bagman({});

        const cookieHeader = ['server_id=abcdef'];
        socket.io.engine.transport.pollXhr.xhr.getResponseHeader.mockReturnValue(cookieHeader);

        const openCallback = socket.io.on.mock.calls[0][1];
        openCallback();

        const pollCompleteCallback = socket.io.engine.transport.on.mock.calls[0][1];
        pollCompleteCallback();

        expect(socket.io.opts.extraHeaders).toEqual({ cookie: 'server_id=abcdef' });
    });

    it('should not set extra headers when there is no cookie header', () => {
        new Bagman({});

        socket.io.engine.transport.pollXhr.xhr.getResponseHeader.mockReturnValue(null);

        const openCallback = socket.io.on.mock.calls[0][1];
        openCallback();

        const pollCompleteCallback = socket.io.engine.transport.on.mock.calls[0][1];
        pollCompleteCallback();

        expect(socket.io.opts.extraHeaders).toBeUndefined();
    });

    it("subscribes to a channel", () => {
        const channel = "test-channel";
        const ack = { status: "ok" };
        socket.emit.mockImplementation((event, data, cb) => cb(ack));

        const bagman = new Bagman({ url: "http://test-url.com" });
        const result = bagman.subscribe(channel);

        expect(socket.emit).toHaveBeenCalledWith("client:subscribe", { channel }, expect.any(Function));
        expect(result).resolves.toEqual(new Channel(socket, channel));
    });

    it("rejects when subscription fails", () => {
        const channel = "test-channel";
        const ack = { status: "error", message: "subscription failed" };
        socket.emit.mockImplementation((event, data, cb) => cb(ack));

        const bagman = new Bagman({ url: "http://test-url.com" });
        const result = bagman.subscribe(channel);

        expect(socket.emit).toHaveBeenCalledWith("client:subscribe", { channel }, expect.any(Function));
        expect(result).rejects.toEqual(new Error("subscription failed"));
    });

    it("defaults to http://localhost:8080 when no url is provided", () => {
        new Bagman({});

        expect(vi.mocked(io)).toHaveBeenCalledWith("http://localhost:8080")
    })
});