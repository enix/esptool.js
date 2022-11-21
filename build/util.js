// Copyright (C) 2021 Toitware ApS. All rights reserved.
// Use of this source code is governed by an MIT-style license that can be
// found in the LICENSE file.
export async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export class Uint8Buffer {
    constructor(size = 64) {
        this.readOffset = 0;
        this.writeOffset = 0;
        this.size = size;
        this._buffer = new ArrayBuffer(this.size);
        this._view = new Uint8Array(this._buffer);
    }
    get length() {
        return this.writeOffset - this.readOffset;
    }
    shift() {
        if (this.length <= 0) {
            return undefined;
        }
        return this._view[this.readOffset++];
    }
    grow(newSize) {
        const newBuffer = new ArrayBuffer(newSize);
        const newView = new Uint8Array(newBuffer);
        newView.set(this._view, 0);
        this.size = newSize;
        this._buffer = newBuffer;
        this._view = newView;
    }
    fill(element, length = 1) {
        this.ensure(length);
        this._view.fill(element, this.writeOffset, this.writeOffset + length);
        this.writeOffset += length;
    }
    ensure(length) {
        if (this.size - this.writeOffset < length) {
            const newSize = this.size + Math.max(length, this.size);
            this.grow(newSize);
        }
    }
    pushBytes(value, byteCount, littleEndian) {
        for (let i = 0; i < byteCount; i++) {
            if (littleEndian) {
                this.push((value >> (i * 8)) & 0xff);
            }
            else {
                this.push((value >> ((byteCount - i) * 8)) & 0xff);
            }
        }
    }
    pack(format, ...args) {
        let pointer = 0;
        const data = args;
        if (format.replace(/[<>]/, "").length != data.length) {
            throw "Pack format to Argument count mismatch";
        }
        let littleEndian = true;
        for (let i = 0; i < format.length; i++) {
            if (format[i] == "<") {
                littleEndian = true;
            }
            else if (format[i] == ">") {
                littleEndian = false;
            }
            else if (format[i] == "B") {
                this.pushBytes(data[pointer], 1, littleEndian);
                pointer++;
            }
            else if (format[i] == "H") {
                this.pushBytes(data[pointer], 2, littleEndian);
                pointer++;
            }
            else if (format[i] == "I") {
                this.pushBytes(data[pointer], 4, littleEndian);
                pointer++;
            }
            else {
                throw "Unhandled character in pack format";
            }
        }
    }
    reset() {
        this.writeOffset = 0;
        this.readOffset = 0;
    }
    push(...bytes) {
        this.ensure(bytes.length);
        this._view.set(bytes, this.writeOffset);
        this.writeOffset += bytes.length;
    }
    copy(bytes) {
        this.ensure(bytes.length);
        this._view.set(bytes, this.writeOffset);
        this.writeOffset += bytes.length;
    }
    /**
     * @name packet
     * returns the bytes between two 0xc0 bytes.
     */
    packet() {
        let dataStart;
        let dataEnd;
        for (let i = this.readOffset; i < this.writeOffset; i++) {
            if (this._view[i] === 0xc0) {
                if (dataStart === undefined) {
                    dataStart = i + 1;
                    // Empty package, normally because of wrong start marker.
                }
                else if (dataStart === i) {
                    dataStart = i + 1;
                }
                else {
                    dataEnd = i;
                    break;
                }
            }
        }
        if (dataEnd === undefined || dataStart === undefined) {
            return undefined;
        }
        this.readOffset = dataEnd + 1;
        const res = new Uint8Array(this._buffer, dataStart, dataEnd - dataStart);
        if (this.readOffset == this.writeOffset) {
            this.reset();
        }
        return res;
    }
    view(reset = true) {
        const res = new Uint8Array(this._buffer, this.readOffset, this.writeOffset);
        if (reset) {
            this.reset();
        }
        return res;
    }
}
/**
 * @name Uint8BufferSlipEncode
 * makes a Uint8Buffer with slipEncoding mechanisms.
 * When slipEncode is enabled it:
 *  * replaces 0xdb with 0xdb 0xdd
 *  * and 0xc0 with 0xdb 0xdc
 * for all write operations.
 */
export class Uint8BufferSlipEncode extends Uint8Buffer {
    constructor() {
        super(...arguments);
        this.slipEncode = false;
    }
    push(...bytes) {
        if (!this.slipEncode) {
            super.push(...bytes);
        }
        else {
            bytes.forEach((v) => this.slipEncodeByte(v));
        }
    }
    reset() {
        this.slipEncode = false;
        super.reset();
    }
    copy(bytes) {
        if (!this.slipEncode) {
            super.copy(bytes);
        }
        else {
            bytes.forEach((v) => this.slipEncodeByte(v));
        }
    }
    /**
     * @name packet
     * returns the bytes between two 0xc0 bytes.
     * decodes slip encoding
     */
    packet(slipDecode = false) {
        const res = super.packet();
        if (res === undefined || !slipDecode) {
            return res;
        }
        let writeOffset = 0;
        for (let i = 0; i < res.byteLength; i++) {
            if (res[i] == 0xdb && i + 1 < res.byteLength && res[i + 1] == 0xdd) {
                res[writeOffset++] = 0xdb;
                i++;
            }
            else if (res[i] == 0xdb && i + 1 < res.byteLength && res[i + 1] == 0xdc) {
                res[writeOffset++] = 0xc0;
                i++;
            }
            else {
                res[writeOffset++] = res[i];
            }
        }
        res.slice(0, writeOffset);
        return res;
    }
    /**
     * @name slipEncodeByte
     * Replaces 0xdb with 0xdb 0xdd and 0xc0 with 0xdb 0xdc
     */
    slipEncodeByte(v) {
        if (v == 0xdb) {
            super.push(0xdb, 0xdd);
        }
        else if (v == 0xc0) {
            super.push(0xdb, 0xdc);
        }
        else {
            super.push(v);
        }
    }
}
export function toByteArray(str) {
    const byteArray = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        const charcode = str.charCodeAt(i);
        byteArray[i] = charcode & 0xff;
    }
    return byteArray;
}
export function toHex(value, size = 2) {
    return "0x" + value.toString(16).toUpperCase().padStart(size, "0");
}
export function isTransientError(e) {
    if (e instanceof DOMException) {
        return (e.name === "BufferOverrunError" ||
            e.name === "BreakError" ||
            e.name === "FramingError" ||
            e.name === "ParityError");
    }
    return false;
}
//# sourceMappingURL=util.js.map