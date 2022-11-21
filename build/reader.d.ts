export declare type Unlisten = () => void;
export interface ReadableOwner {
    readonly readable: ReadableStream<Uint8Array>;
}
export declare class Reader {
    private buffer;
    private readableOwner;
    private running;
    private closing;
    private reader;
    private completer;
    private runPromise;
    private listenRef;
    constructor(readableOwner: ReadableOwner);
    start(): void;
    stop(): Promise<unknown>;
    private run;
    listen(): Unlisten;
    private waitData;
    waitSilent(retry: number, timeoutMs: number): Promise<boolean>;
    read(minLength: number, timeoutMs: number): Promise<Uint8Array>;
    packet(minLength: number, timeoutMs: number): Promise<Uint8Array>;
}
export declare class Completer<T> {
    readonly promise: Promise<T>;
    private _complete;
    private _reject;
    constructor(timeoutMs?: number | undefined);
    complete(value: PromiseLike<T> | T): void;
    reject(reason?: unknown): void;
}
//# sourceMappingURL=reader.d.ts.map