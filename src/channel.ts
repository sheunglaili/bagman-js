import { ClientSocket } from "./types";

/**
 * A class representing a Channel for the Bagman client.
 */
export class Channel {
    /**
     * Creates a new instance of Channel.
     * 
     * @param socket - The socket.io client socket to use for communication.
     * @param channel - The name of the channel to subscribe to.
     */
    constructor(
        private socket: ClientSocket,
        private channel: string) { }

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
        this.socket.on(`${this.channel}:${event}`, cb as (...args: any[]) => void);
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
    publish<Data extends any>(event: string, data: Data) {
        return new Promise<void>((resolve, reject) => {
            this.socket.emit('client:emit', { channel: this.channel, event, data }, (ack) => {
                if (ack.status === "ok") {
                    resolve()
                } else {
                    reject(new Error(ack.message))
                }
            })
        })
    }

    /**
     * Unsubscribes from the channel.
     * 
     * @returns Promise<void> - A promise that resolves if the unsubscribe was successful, and rejects if there was an error.
     */
    unsubscribe() {
        return new Promise<void>((resolve, reject) => {
            this.socket.emit('client:unsubscribe', { channel: this.channel }, (ack) => {
                if (ack.status === "ok") {
                    resolve()
                } else {
                    reject(new Error(ack.message))
                }
            })
        })
    }
}