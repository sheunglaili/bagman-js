import { io } from "socket.io-client"
import { parse } from "cookie";

import { Channel } from "./channel";
import { ClientSocket } from "./types";

type BagmanArgs = {
    url?: string
}

export class Bagman {
    private socket: ClientSocket;

    constructor({ url }: BagmanArgs) {
        this.socket = io(url || "http://localhost:8080");
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

    subscribe(channel: string) {
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
}