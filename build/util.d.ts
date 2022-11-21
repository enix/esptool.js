export declare function sleep(ms: number): Promise<void>;
export declare class Uint8Buffer {
    private readOffset;
    private writeOffset;
    private size;
    private _buffer;
    private _view;
    constructor(size?: number);
    get length(): number;
    shift(): number | undefined;
    private grow;
    fill(element: number, length?: number): void;
    private ensure;
    private pushBytes;
    pack(format: string, ...args: number[]): void;
    reset(): void;
    push(...bytes: number[]): void;
    copy(bytes: Uint8Array): void;
    /**
     * @name packet
     * returns the bytes between two 0xc0 bytes.
     */
    packet(): Uint8Array | undefined;
    view(reset?: boolean): Uint8Array;
}
/**
 * @name Uint8BufferSlipEncode
 * makes a Uint8Buffer with slipEncoding mechanisms.
 * When slipEncode is enabled it:
 *  * replaces 0xdb with 0xdb 0xdd
 *  * and 0xc0 with 0xdb 0xdc
 * for all write operations.
 */
export declare class Uint8BufferSlipEncode extends Uint8Buffer {
    slipEncode: boolean;
    push(...bytes: number[]): void;
    reset(): void;
    copy(bytes: Uint8Array): void;
    /**
     * @name packet
     * returns the bytes between two 0xc0 bytes.
     * decodes slip encoding
     */
    packet(slipDecode?: boolean): Uint8Array | undefined;
    /**
     * @name slipEncodeByte
     * Replaces 0xdb with 0xdb 0xdd and 0xc0 with 0xdb 0xdc
     */
    private slipEncodeByte;
}
export declare function toByteArray(str: string): Uint8Array;
export declare function toHex(value: number, size?: number): string;
export declare function isTransientError(e: unknown): boolean;
//# sourceMappingURL=util.d.ts.map