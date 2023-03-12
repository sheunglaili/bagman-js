import { vi, it, expect, describe, beforeEach, MockedObject } from "vitest";

import { Channel } from "../src/channel";
import { ClientSocket } from "../src/types";

describe("Channel", () => {
    let channel: Channel;
    let socket: MockedObject<ClientSocket>;

    beforeEach(() => {
        socket = { on: vi.fn(), emitWithAck: vi.fn() } as any;
        channel = new Channel(socket, "test-channel");
    });

    it("listens to an event", () => {
        const event = "test-event";
        const cb = vi.fn();

        channel.listen(event, cb);

        expect(socket.on).toHaveBeenCalledWith(`channel:test-channel:${event}`, cb);
    });

    it("publishes an event", async () => {
        const event = "test-event";
        const data = { test: "data" };
        const ack = { status: "ok" };
        // @ts-ignore
        socket.emitWithAck.mockResolvedValue(ack);

        await channel.publish(event, data);

        expect(socket.emitWithAck).toHaveBeenCalledWith("client:emit", { channel: "test-channel", event, data });
    });

    it("rejects when publishing fails", async () => {
        const event = "test-event";
        const data = { test: "data" };
        const ack = { status: "error", message: "publish failed" };
        // @ts-ignore
        socket.emitWithAck.mockResolvedValue(ack);

        const result = channel.publish(event, data);

        await expect(result).rejects.toThrowError("publish failed");
        expect(socket.emitWithAck).toHaveBeenCalledWith("client:emit", { channel: "test-channel", event, data });
    });

    it("unsubscribes from a channel", async () => {
        const ack = { status: "ok" };

        // @ts-ignore
        socket.emitWithAck.mockResolvedValue(ack);

        const result = await channel.unsubscribe();

        expect(socket.emitWithAck).toHaveBeenCalledWith("client:unsubscribe", { channel: "test-channel" });
        expect(result).toEqual(undefined);
    });

    it("should not be able to re-used unsubscribed", async () => {
        const ack = { status: "ok" };

        // @ts-ignore
        socket.emitWithAck.mockResolvedValue(ack);

        await channel.unsubscribe();

        await expect(channel.publish("test-channel", {})).rejects.toThrowError("Channel: test-channel is deactivated. Please subscribe to this channel again.")
    });

    it("rejects when unsubscribing fails", async () => {
        const ack = { status: "error", message: "unsubscribe failed" };
        // @ts-ignore
        socket.emitWithAck.mockResolvedValue(ack);

        const result = channel.unsubscribe();

        await expect(result).rejects.toThrowError("unsubscribe failed");
        expect(socket.emitWithAck).toHaveBeenCalledWith("client:unsubscribe", { channel: "test-channel" });
    });

    it("should fetch presences ", async () => {
        const ack = { presences: [{ id: '123' }, { id: '456' }] };
        // @ts-ignore
        socket.emitWithAck.mockResolvedValue(ack);

        const result = await channel.presences();

        expect(result).toEqual(ack.presences);
    })

    it("should handle fetch exception", async () => {
        const ack = { status: "error", message: "Failed to fetch presences." };
        // @ts-ignore
        socket.emitWithAck.mockResolvedValue(ack);

        expect(channel.presences()).rejects.toThrowError(ack.message);
    })
});