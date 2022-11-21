// Copyright (C) 2021 Toitware ApS. All rights reserved.
// Use of this source code is governed by an MIT-style license that can be
// found in the LICENSE file.
import { AlreadyRunningError, NotListeningError, NotRunningError, ReadAlreadyInProgressError, TimeoutError, } from "./errors";
import { isTransientError, sleep, Uint8Buffer } from "./util";
export class Reader {
    constructor(readableOwner) {
        this.running = false;
        this.closing = false;
        this.reader = undefined;
        this.completer = undefined;
        this.runPromise = undefined;
        this.listenRef = 0;
        this.buffer = new Uint8Buffer();
        this.readableOwner = readableOwner;
    }
    start() {
        if (this.runPromise !== undefined) {
            throw AlreadyRunningError;
        }
        this.buffer.reset();
        this.closing = false;
        this.runPromise = this.run();
    }
    async stop() {
        if (this.runPromise === undefined) {
            throw NotRunningError;
        }
        this.closing = true;
        if (this.reader !== undefined) {
            try {
                await this.reader.cancel();
            }
            catch (e) { }
        }
        try {
            await this.runPromise;
            return undefined;
        }
        catch (e) {
            return e;
        }
        finally {
            this.buffer.reset();
            this.runPromise = undefined;
        }
    }
    async run() {
        try {
            this.running = true;
            while (!this.closing) {
                if (this.reader === undefined) {
                    this.reader = this.readableOwner.readable.getReader();
                }
                const reader = this.reader;
                try {
                    const { value, done } = await reader.read();
                    if (done) {
                        reader.releaseLock();
                        this.reader = undefined;
                        await sleep(1);
                        continue;
                    }
                    if (!value) {
                        continue;
                    }
                    if (this.listenRef > 0) {
                        this.buffer.copy(value);
                    }
                    if (this.completer !== undefined) {
                        this.completer.complete();
                    }
                }
                catch (e) {
                    if (!isTransientError(e)) {
                        throw e;
                    }
                    // on a transient error, close the current reader and retry.
                    try {
                        await reader.cancel();
                    }
                    catch (e) { }
                    reader.releaseLock();
                    this.reader = undefined;
                    await sleep(1);
                }
            }
        }
        finally {
            if (this.reader !== undefined) {
                try {
                    await this.reader.cancel();
                }
                catch (e) { }
                this.reader.releaseLock();
                this.reader = undefined;
            }
            this.running = false;
        }
    }
    listen() {
        if (!this.running) {
            throw NotRunningError;
        }
        this.listenRef++;
        return () => {
            this.listenRef--;
            if (this.listenRef < 0) {
                throw "Listen ref count is negative";
            }
            if (this.listenRef == 0) {
                this.buffer.reset();
            }
        };
    }
    async waitData(minLength, timeoutMs = undefined) {
        if (!this.running) {
            throw NotRunningError;
        }
        if (this.completer !== undefined) {
            throw ReadAlreadyInProgressError;
        }
        while (this.buffer.length < minLength) {
            this.completer = new Completer(timeoutMs);
            try {
                await this.completer.promise;
            }
            finally {
                this.completer = undefined;
            }
        }
    }
    async waitSilent(retry, timeoutMs) {
        while (retry--) {
            this.buffer.reset();
            try {
                await this.waitData(1, timeoutMs);
            }
            catch (e) {
                if (e === TimeoutError) {
                    return true;
                }
                throw e;
            }
            await sleep(50);
        }
        return false;
    }
    async read(minLength, timeoutMs) {
        if (this.listenRef <= 0) {
            throw NotListeningError;
        }
        await this.waitData(minLength, timeoutMs);
        return this.buffer.view(true);
    }
    async packet(minLength, timeoutMs) {
        if (this.listenRef <= 0) {
            throw NotListeningError;
        }
        let maxRetries = 1000;
        while (maxRetries--) {
            await this.waitData(minLength, timeoutMs);
            const res = this.buffer.packet();
            if (res !== undefined) {
                return res;
            }
            // no packet was available in minLength, so we wait for another byte.
            minLength++;
        }
        throw TimeoutError;
    }
}
export class Completer {
    constructor(timeoutMs = undefined) {
        this.promise = new Promise((resolve, reject) => {
            this._complete = resolve;
            this._reject = reject;
            if (timeoutMs !== undefined) {
                if (timeoutMs > 0) {
                    setTimeout(() => reject(TimeoutError), timeoutMs);
                }
                else {
                    reject(TimeoutError);
                }
            }
        });
    }
    complete(value) {
        if (this._complete !== undefined) {
            this._complete(value);
        }
    }
    reject(reason) {
        if (this._reject !== undefined) {
            this._reject(reason);
        }
    }
}
//# sourceMappingURL=reader.js.map