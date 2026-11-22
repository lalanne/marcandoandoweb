// Spec 004, criteria 13 and 20: what the smoke test leaves out of its "no request
// fails, no console errors" check. Only Vercel Web Analytics' own URLs
// (/_vercel/insights/...): the script is 404 outside Vercel and until the owner
// enables Analytics, and a missing visit counter must not fail a working deploy.
// Nothing else is left out.

const ANALYTICS_PATH_PREFIX = "/_vercel/insights/";

/** True when `url` is an absolute http(s) URL whose path starts with /_vercel/insights/. */
export function isIgnoredRequest(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  return parsed.pathname.startsWith(ANALYTICS_PATH_PREFIX);
}

/**
 * True for the browser's "Failed to load resource" console error when the
 * resource it is about (`location.url` of the console message; the text itself
 * does not name it) is one of the ignored requests. Any other error counts.
 */
export function isIgnoredConsoleError(
  text: string,
  locationUrl: string | undefined,
): boolean {
  return (
    text.startsWith("Failed to load resource") &&
    !!locationUrl &&
    isIgnoredRequest(locationUrl)
  );
}
