// Copyright 2026 Neil Manfred
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { getUriConnection, makeConnRoute, normConn } from "./waveutil";

describe("getUriConnection", () => {
    it("extracts host from wsh URI", () => {
        expect(getUriConnection("wsh://my-ssh/home/user/file.txt")).toBe("my-ssh");
        expect(getUriConnection("wsh://local/path/to/file")).toBe("local");
        expect(getUriConnection("wsh://user@server/tmp/out")).toBe("user@server");
    });

    it("returns local for non-wsh URIs", () => {
        expect(getUriConnection("")).toBe("local");
        expect(getUriConnection("wsh:///path")).toBe("local");
        expect(getUriConnection("not-a-wsh-uri")).toBe("local");
    });
});

describe("normConn", () => {
    it("normalises empty/null-ish to local", () => {
        expect(normConn("")).toBe("local");
        expect(normConn("local")).toBe("local");
        expect(normConn("my-ssh")).toBe("my-ssh");
    });
});

describe("makeConnRoute", () => {
    it("builds conn: route from wsh URI", () => {
        expect(makeConnRoute("wsh://my-ssh/path")).toBe("conn:my-ssh");
        expect(makeConnRoute("wsh://local/path")).toBe("conn:local");
    });

    it("falls back to conn:local for unusual inputs", () => {
        expect(makeConnRoute("")).toBe("conn:local");
        expect(makeConnRoute("wsh:///path")).toBe("conn:local");
        expect(makeConnRoute("not-a-wsh-uri")).toBe("conn:local");
    });
});
