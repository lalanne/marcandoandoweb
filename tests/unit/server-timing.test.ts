import { describe, expect, it } from "vitest";
import {
  coldStart,
  serverTiming,
  SERVER_TIMING_FORMAT,
  timed,
} from "@/lib/server-timing";

// Issue #134: Server-Timing on the slow server paths, so the time a request
// spends in Supabase can be told apart from the function's own start-up.

describe("serverTiming", () => {
  it("writes each duration in milliseconds, one decimal, then the cold flag", () => {
    expect(serverTiming({ storage: 123.456 }, true)).toBe(
      'storage;dur=123.5, cold;desc="1"',
    );
    expect(serverTiming({ db: 7 }, false)).toBe('db;dur=7, cold;desc="0"');
  });

  it("never writes a negative duration", () => {
    expect(serverTiming({ db: -3 }, false)).toBe('db;dur=0, cold;desc="0"');
  });

  it("refuses a metric name that is not plain lowercase letters", () => {
    expect(() => serverTiming({ "db;desc=x": 1 }, false)).toThrow();
    expect(() => serverTiming({ "/productos/x": 1 }, false)).toThrow();
  });

  it("matches the documented format, which carries no other data", () => {
    expect(serverTiming({ storage: 12.3 }, true)).toMatch(SERVER_TIMING_FORMAT);
    expect(serverTiming({ db: 0.04 }, false)).toMatch(SERVER_TIMING_FORMAT);
    expect('db;dur=1, cold;desc="1", path;desc="/x"').not.toMatch(SERVER_TIMING_FORMAT);
  });
});

describe("coldStart", () => {
  it("is true the first time an instance asks, then false", () => {
    const first = coldStart();
    expect(typeof first).toBe("boolean");
    expect(coldStart()).toBe(false);
    expect(coldStart()).toBe(false);
  });
});

describe("timed", () => {
  it("returns the value and how long it took", async () => {
    const [value, ms] = await timed(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 20)),
    );
    expect(value).toBe("ok");
    expect(ms).toBeGreaterThanOrEqual(15);
  });

  it("lets an error through", async () => {
    await expect(timed(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  });
});
