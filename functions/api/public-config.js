import { json, localHumanBypassAllowed } from "../_utils.js";

const REQUIRED = ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "SUBMISSION_HASH_SALT"];

/**
 * Cloudflare's documented dummy site keys all begin 1x, 2x or 3x and render on
 * any hostname. A live key (0x…) renders only on the hostnames configured in the
 * Turnstile dashboard, which is why one on localhost fails with no useful error.
 */
function turnstileMode(siteKey) {
  return /^[123]x/.test(String(siteKey ?? "")) ? "test" : "live";
}

export function onRequestGet(context) {
  const missing = REQUIRED.filter((name) => !context.env[name]);
  const siteKey = context.env.TURNSTILE_SITE_KEY;
  const hostname = (() => {
    try {
      return new URL(context.request.url).hostname;
    } catch {
      return "";
    }
  })();

  if (!siteKey) return json({ submissionsEnabled: false, missing, hostname });

  return json({
    submissionsEnabled: true,
    turnstileSiteKey: siteKey,
    // Enough for the form to explain a render failure instead of guessing.
    turnstileMode: turnstileMode(siteKey),
    localHumanBypass: localHumanBypassAllowed(context),
    hostname,
    missing,
  });
}
