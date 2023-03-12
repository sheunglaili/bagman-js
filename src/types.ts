import { Socket } from "socket.io-client";

export type ServerToClientEvents = {
    [event: string]: (...args: any[]) => void
}

export type ClientToServerEvents = {
    'client:subscribe': (subscriptionData: SubscriptionData, cb: SubscriptionAckCallback) => Promise<void> | void;
    'client:unsubscribe': (subscriptionData: UnsubscriptionData, cb: UnsubscriptionAckCallback) => Promise<void> | void;
    'client:emit': (emissionData: EmissionData, cb: EmissionAckCallback) => Promise<void> | void;
    'presence:fetch': <T>(presenceFetchData: FetchPresenceData, cb: FetchPresenceAckCallback<T>) => Promise<void> | void;
}

export type BaseAck = {
    status: "ok" | "error",
    message?: string
}
export type BaseAckCallback<Ack = any> = (e: Ack) => void

export type SubscriptionData = {
    channel: string
}
export type SubscriptionAck = BaseAck
export type SubscriptionAckCallback = BaseAckCallback<SubscriptionAck>;

export type UnsubscriptionData = SubscriptionData;
export type UnsubscriptionAck = BaseAck;
export type UnsubscriptionAckCallback = BaseAckCallback<SubscriptionAck>;

export type EmissionData<Data = any> = {
    channel: string
    event: string
    data: Data
};
export type EmissionAck = BaseAck;
export type EmissionAckCallback = BaseAckCallback<EmissionAck>;

export type Presence<T = any> = {
    id: string;
    user: T
}

export type FetchPresenceData = { 
    channel: string
}
export type FetchPresenceAck<T> = {
    presences: Presence<T>[]
} | BaseAck

export type FetchPresenceAckCallback<T> = BaseAckCallback<FetchPresenceAck<T>>;

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConfigResolver<T> =  (() => (Promise<T> | T)) | T | Promise<T>;
type ExtraHeadersConfig = ConfigResolver<Record<string, string>>;
type ExtraParamsConfig = ConfigResolver<Record<string, string>>;
type BodyConfig = ConfigResolver<string>;

export type AuthorizerConfig = {
    scheme?: string;
    host: string;
    port?: number;
    path: string;
    method?: string;
    extraHeaders?: ExtraHeadersConfig;
    extraParams?: ExtraParamsConfig;
    body?: BodyConfig
}

export type BagmanConfig = {
    url?: string
    apiKey?: string
    authorizer?: AuthorizerConfig
}