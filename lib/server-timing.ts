/**
 * Server-Timing for the slow server paths (issue #134): how long a request
 * spent waiting on Supabase, and whether this function instance had just
 * started. Durations and the cold flag only, never a path, slug, key or row:
 * callers add it to successful responses only, so a 404 or 503 reveals nothing
 * more than before.
 */

/** The whole header, as `serverTiming` writes it. Tests check against it. */
export const SERVER_TIMING_FORMAT =
  /^([a-z]+;dur=\d+(\.\d)?, )+cold;desc="[01]"$/;

const NAME = /^[a-z]+$/;

let started = false;

/** True the first time this instance asks (it just started), then false. */
export function coldStart(): boolean {
  const cold = !started;
  started = true;
  return cold;
}

/** Runs `work` and returns its value with how long it took, in milliseconds. */
export async function timed<T>(work: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const value = await work();
  return [value, performance.now() - start];
}

/** `storage;dur=123.4, cold;desc="1"`. Metric names are plain lowercase letters. */
export function serverTiming(durations: Record<string, number>, cold: boolean): string {
  const parts = Object.entries(durations).map(([name, ms]) => {
    if (!NAME.test(name)) throw new Error(`Invalid Server-Timing name: ${name}`);
    return `${name};dur=${Math.round(Math.max(0, ms) * 10) / 10}`;
  });
  return [...parts, `cold;desc="${cold ? 1 : 0}"`].join(", ");
}
