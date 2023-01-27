import { vi, it, expect, describe, beforeEach, Mocked, MockedObject } from "vitest";

import { Channel } from "../src/channel";
import { ClientSocket } from "../src/types";

describe("Channel", () => {
    let channel: Channel;
    let socket: MockedObject<ClientSocket>;

    beforeEach(() => {
        socket = { on: vi.fn(), emit: vi.fn() } as any;
        channel = new Channel(socket, "test-channel");
    });

    it("listens to an event", () => {
        const event = "test-event";
        const cb = vi.fn();

        channel.listen(event, cb);

        expect(socket.on).toHaveBeenCalledWith(event, cb);
    });

    it("publishes an event", () => {
        const event = "test-event";
        const data = { test: "data" };
        const ack = { status: "ok" };
        // @ts-ignore
        socket.emit.mockImplementation((event, data, cb) => cb(ack));

        const result = channel.publish(event, data);

        expect(socket.emit).toHaveBeenCalledWith("client:emit", { channel: "test-channel", event, data }, expect.any(Function));
        expect(result).resolves.toEqual(undefined);
    });

    it("rejects when publishing fails", () => {
        const event = "test-event";
        const data = { test: "data" };
        const ack = { status: "error", message: "publish failed" };
        // @ts-ignore
        socket.emit.mockImplementation((event, data, cb) => cb(ack));

        const result = channel.publish(event, data);

        expect(socket.emit).toHaveBeenCalledWith("client:emit", { channel: "test-channel", event, data }, expect.any(Function));
        expect(result).rejects.toEqual(new Error("publish failed"));
    });

    it("unsubscribes from a channel", () => {
        const ack = { status: "ok" };
        
        // @ts-ignore
        socket.emit.mockImplementation((event, data, cb) => cb(ack));

        const result = channel.unsubscribe();

        expect(socket.emit).toHaveBeenCalledWith("client:unsubscribe", { channel: "test-channel" }, expect.any(Function));
        expect(result).resolves.toEqual(undefined);
    });

    it("rejects when unsubscribing fails", () => {
        const ack = { status: "error", message: "unsubscribe failed" };
        // @ts-ignore
        socket.emit.mockImplementation((event, data, cb) => cb(ack));

        const result = channel.unsubscribe();

        expect(socket.emit).toHaveBeenCalledWith("client:unsubscribe", { channel: "test-channel" }, expect.any(Function));
        expect(result).rejects.toEqual(new Error("unsubscribe failed"));
    });
});