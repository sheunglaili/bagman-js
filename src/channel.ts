import { ClientSocket, Presence } from "./types";

/**
 * A class representing a Channel for the Bagman client.
 */
export class Channel {

    /**
     * @param deactivated - Whether this channel is deactivated.
     */
    private deactivated: boolean = false;
    /**
     * Creates a new instance of Channel.
     * 
     * @param socket - The socket.io client socket to use for communication.
     * @param channel - The name of the channel to subscribe to.
     */
    constructor(
        private socket: ClientSocket,
        private channel: string) {}

    /**
     * Registers a callback function to be executed when the specified event is emitted.
     * 
     * @template T - The type of data to be passed as arguments to the callback function.
     * @param event - The name of the event to listen for.
     * @param cb - The callback function to be executed when the specified event is emitted.
     * 
     * @returns void
     */
    listen<T extends [...any[]]>(event: string, cb: (...args: T) => Promise<void> | void) {
        this.socket.on(`channel:${this.channel}:${event}`, cb as (...args: any[]) => void);
    }

    /**
     * Fetch Presences of the current channel.
     * 
     * @template T - the type of presence that you expected to receive
     * @returns - list of presences that's within this channel
     */
    async presences<T>(): Promise<Presence<T>[]> {
        const ack = await this.socket.emitWithAck(`presence:fetch`, { channel: this.channel });
        if ("status" in ack) {
            throw new Error(ack.message);
        }
        return ack.presences as Presence<T>[]
    }


    /**
     * Publishes an event to the channel.
     * 
     * @template Data - The type of data to be passed along with the event.
     * @param event - The name of the event to be published.
     * @param data - The data to be passed along with the event.
     * 
     * @returns Promise<void> - A promise that resolves if the event was successfully published, and rejects if there was an error.
     */
    async publish<Data extends any>(event: string, data: Data) {
        if (this.deactivated) throw new Error(`Channel: ${this.channel} is deactivated. Please subscribe to this channel again.`)
        
        const ack = await this.socket.emitWithAck('client:emit', { channel: this.channel, event, data});
        if (ack.status !== "ok") {
            throw new Error(ack.message);
        }
    }

    /**
     * Unsubscribes from the channel.
     * 
     * @returns Promise<void> - A promise that resolves if the unsubscribe was successful, and rejects if there was an error.
     */
    async unsubscribe() {
        this.deactivated = true;
        const ack = await this.socket.emitWithAck('client:unsubscribe', { channel: this.channel });
        if (ack.status !== "ok") {
            throw new Error(ack.message);
        }
    }
}