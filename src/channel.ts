import { ClientSocket } from "./types";

export class Channel {
    constructor(
        private socket: ClientSocket,
        private channel: string) { }

    listen<T extends any>(event: string, cb: (event: string, args: T) => Promise<void> | void) {
        this.socket.on(event, cb);
    }

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