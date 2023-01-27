import { io } from "socket.io-client"
import { Channel } from "./channel";
import { ClientSocket} from "./types";

type BagmanArgs = {
    url?: string
}

export class Bagman {
    private socket: ClientSocket;

    constructor({ url }: BagmanArgs) {
        this.socket = io(url || "http://localhost:8080");
    }

    subscribe(channel: string) {
        return new Promise<Channel>((resolve, reject) => {
            this.socket.emit('client:subscribe', { channel }, (ack) => {
                if (ack.status === "ok"){ 
                    resolve(new Channel(this.socket, channel));
                } else {
                    reject(new Error(ack.message));
                }
            });
        })
    }
}