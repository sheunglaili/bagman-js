import { vi, it, expect, describe, beforeEach, afterEach } from "vitest";

import { Bagman } from "../src";
import { Channel } from "../src/channel";
import { io } from "socket.io-client";

vi.mock("socket.io-client", () => {
    const mockSocket = {
        emit: vi.fn(),
        on: vi.fn()
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
    })

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