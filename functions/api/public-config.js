import {
  json, localHumanBypassAllowed, isLoopbackRequest,
  MIN_ADMIN_SECRET_LENGTH, RECOMMENDED_ADMIN_SECRET_LENGTH,
} from "../_utils.js";

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
    // The review console needs to know which unlock methods exist so it can
    // show the right form. Everyone else does not: announcing "a shared-secret
    // door exists and is armed" to an unauthenticated GET is a free tip-off,
    // and secretStatus would additionally have told an attacker when the
    // operator had misconfigured it. Reviewers reach this over loopback in
    // development and behind Cloudflare Access in production; a cold caller
    // gets the submission fields and nothing about the back door.
    ...(reviewAuthVisible(context) ? { reviewAuth: reviewAuthState(context) } : {}),
  });
}

/**
 * Who may see the review-auth capability block. Loopback covers local
 * rehearsal; an Access assertion covers the deployed console. Both are checked
 * cheaply — this is a disclosure gate, not an authorisation one, so it does not
 * need to verify the JWT signature. Anything that gets past it still has to
 * satisfy requireReviewer() before touching a submission.
 */
function reviewAuthVisible(context) {
  if (isLoopbackRequest(context.request)) return true;
  return Boolean(context.request.headers.get("CF-Access-Jwt-Assertion"));
}

function reviewAuthState(context) {
  const secretLength = String(context.env.ADMIN_REVIEW_SECRET ?? "").length;
  return {
    access: Boolean(context.env.CF_ACCESS_TEAM_DOMAIN && context.env.CF_ACCESS_AUD),
    secret: secretLength >= MIN_ADMIN_SECRET_LENGTH,
    // "weak" is accepted but nagged about: a live short secret keeps working
    // rather than locking the operator out, and the console says to lengthen it.
    secretStatus: secretLength === 0
      ? "missing"
      : secretLength < MIN_ADMIN_SECRET_LENGTH ? "too-short"
      : secretLength < RECOMMENDED_ADMIN_SECRET_LENGTH ? "weak" : "ready",
    reviewerAllowlist: Boolean(String(context.env.REVIEWER_EMAILS ?? "").trim()),
    localBypass: isLoopbackRequest(context.request) && Boolean(context.env.DEV_REVIEWER_EMAIL),
  };
}
