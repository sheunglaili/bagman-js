import { io } from "socket.io-client"
import { parse } from "cookie";

import { Channel } from "./channel";
import { ClientSocket } from "./types";

type BagmanArgs = {
    url?: string
}

export type GlobalEvent = "disconnect" | "disconnecting" | "connect" | "connect_error";

const GLOBAL_EVENT: GlobalEvent[] = ["connect", "connect_error", "disconnect", "disconnecting"];

export class Bagman {
    /**
     * The socket connection.
     * @private
     */
    private socket: ClientSocket;

    /**
     * Creates a new `Bagman` instance.
     * @param {BagmanArgs} - The URL for the websocket server.
     */
    constructor({ url }: BagmanArgs) {
        this.socket = io(url || "http://localhost:8080", {
            transports: ["websocket", "polling"],
            rememberUpgrade: true
        });
        // for storing cookies from response if http transport are used
        this.socket.io.on("open", () => {
            this.socket.io.engine.transport.on("pollComplete", () => {
                const request = this.socket.io.engine.transport.pollXhr.xhr;
                const cookieHeader = request.getResponseHeader("set-cookie");
                if (!cookieHeader) {
                    return;
                }
                const COOKIE_NAME = 'server_id';
                cookieHeader.forEach((cookieString: string) => {
                    if (cookieString.includes(`${COOKIE_NAME}=`)) {
                        const cookie = parse(cookieString);
                        this.socket.io.opts.extraHeaders = {
                            cookie: `${COOKIE_NAME}=${cookie[COOKIE_NAME]}`
                        }
                    }
                });
            });
        })
    }

    /**
    * Subscribes to a channel.
    * @param {string} channel - The channel to subscribe to.
    * @returns {Promise<Channel>} A promise that resolves with a `Channel` instance.
    */
    subscribe(channel: string): Promise<Channel> {
        return new Promise<Channel>((resolve, reject) => {
            this.socket.emit('client:subscribe', { channel }, (ack) => {
                if (ack.status === "ok") {
                    resolve(new Channel(this.socket, channel));
                } else {
                    reject(new Error(ack.message));
                }
            });
        })
    }

    /**
     * Listens to a specific global event.
     * @template T The type of the arguments to be passed to the callback.
     * @param {GlobalEvent} event - The global event to listen to.
     * @param {(...args: T) => Promise<void> | void} cb - The callback to be called when the event is emitted.
     * @throws {Error} When an invalid event is provided.
     */
    listen<T extends [...any[]]>(event: GlobalEvent, cb: (...args: T) => Promise<void> | void) {
        if (!GLOBAL_EVENT.includes(event)) throw new Error(`Invalid Global event: ${event}`);
        this.socket.on(event, cb);
    }

    close() {
      this.socket.disconnect();
    }
}