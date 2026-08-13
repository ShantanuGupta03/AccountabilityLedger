const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

/** Must match assets/data/categories.json and scripts/validate_cases.py. */
export const CASE_CATEGORIES = new Set([
  "Consumer harm",
  "Crony capital (alleged)",
  "Data denial",
  "Democratic institutions",
  "Economic shock",
  "Environment",
  "Exam integrity",
  "Fund opacity",
  "National security",
  "Policy misfire",
  "Public money",
  "Public safety",
  "Rights and dissent",
]);

export function isValidCategory(category) {
  return CASE_CATEGORIES.has(String(category ?? "").trim());
}

let accessJwks;

function base64UrlBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function parseJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));
}

async function verifiedAccessEmail(token, env) {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  try {
    const header = parseJwtPart(encodedHeader);
    const payload = parseJwtPart(encodedPayload);
    if (header.alg !== "RS256" || !header.kid || payload.exp * 1000 <= Date.now()) return null;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(env.CF_ACCESS_AUD)) return null;
    if (payload.iss !== `https://${env.CF_ACCESS_TEAM_DOMAIN}/`) return null;

    if (!accessJwks) {
      const response = await fetch(`https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
      if (!response.ok) return null;
      accessJwks = await response.json();
    }
    const jwk = accessJwks.keys?.find((key) => key.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      base64UrlBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    return valid && typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new TypeError("Send the request as application/json.");
  }
  return request.json();
}

export function isNonEmptyString(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function parseHttpUrls(value, maxUrls = 8) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxUrls) {
    throw new TypeError(`Provide between 1 and ${maxUrls} source URLs.`);
  }
  return value.map((item) => {
    if (!isNonEmptyString(item, 2_000)) throw new TypeError("Each source URL must be a non-empty string.");
    const url = new URL(item);
    if (!["http:", "https:"].includes(url.protocol)) throw new TypeError("Sources must use HTTP or HTTPS.");
    return url.href;
  });
}

export function parseOfficeHolders(value) {
  if (!Array.isArray(value) || value.length > 12) throw new TypeError("Provide up to 12 office-holders.");
  return value.map((item) => {
    if (!isNonEmptyString(item, 160)) throw new TypeError("Each office-holder must be a short text value.");
    return item.trim();
  });
}

export async function hash(value, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * True when this request may skip Turnstile. Needs BOTH a loopback host and
 * ALLOW_LOCAL_TURNSTILE_BYPASS explicitly set, so it cannot be switched on for a
 * deployed site: Cloudflare Pages is never reached on localhost.
 *
 * It exists because a live Turnstile widget only renders on the hostnames listed
 * in its dashboard, which never includes localhost, so there is otherwise no way
 * to rehearse a submission before going live.
 */
export function localHumanBypassAllowed(context) {
  return isLoopbackRequest(context.request)
    && String(context.env.ALLOW_LOCAL_TURNSTILE_BYPASS ?? "") === "true";
}

/**
 * Turnstile verification, with the loopback-only development bypass in front.
 * Returns "pass", "fail" or "unavailable" — see verifyTurnstile.
 */
export async function verifyHuman(context, token) {
  if (localHumanBypassAllowed(context) && token === LOCAL_HUMAN_TOKEN) return "pass";
  return verifyTurnstile(
    token,
    context.env.TURNSTILE_SECRET_KEY,
    context.request.headers.get("CF-Connecting-IP"),
  );
}

/**
 * Minimum time a real person needs between the form rendering and pressing send.
 * Eight seconds is under any genuine attempt to fill these forms in and over any
 * scripted post. Only consulted when there is no Turnstile token to trust.
 */
const MIN_DWELL_MS = 8_000;

/**
 * The human check, in the order of what it can actually establish.
 *
 * Turnstile is the good path and stays the good path. What changed is the bad
 * path: a reader whose browser could not load challenges.cloudflare.com used to
 * be refused outright, which is a strange way to run a ledger that asks the
 * public for evidence. A tokenless submission is now accepted if it clears two
 * cheap tests a script does not bother with — an untouched honeypot field and
 * having existed on screen for longer than a moment — and is flagged for the
 * reviewer instead of being thrown away.
 *
 * Returns { ok, verified, reason }. `verified` false means accept-but-flag, and
 * the caller is expected to apply its stricter rate limit to those.
 */
export async function humanCheck(context, { token, honeypot, dwellMs }) {
  // A bot filling in every field it finds is the cheapest signal there is, and
  // it is worth rejecting whether or not a token came with it.
  if (isNonEmptyString(honeypot, 500)) {
    return { ok: false, verified: false, reason: "honeypot" };
  }

  if (isNonEmptyString(token, 4_000)) {
    const outcome = await verifyHuman(context, token);
    if (outcome === "pass") return { ok: true, verified: true, reason: "turnstile" };
    if (outcome === "fail") return { ok: false, verified: false, reason: "turnstile-failed" };
    // "unavailable": our verifier, our problem. Fall through to the cheap checks
    // and accept the submission flagged, exactly as if no token had arrived.
  }

  const dwell = Number(dwellMs);
  if (!Number.isFinite(dwell) || dwell < MIN_DWELL_MS) {
    return { ok: false, verified: false, reason: "too-fast" };
  }
  return { ok: true, verified: false, reason: "unverified" };
}

/** What to tell the sender when humanCheck refuses. Never leaks the honeypot. */
export function humanCheckError(reason) {
  if (reason === "turnstile-failed") return "Human-verification failed. Please try again.";
  if (reason === "too-fast") return "That was sent too quickly to be checked. Wait a moment and send it again.";
  return "That submission could not be accepted.";
}

/**
 * Three outcomes, not two, and the difference matters.
 *
 * "fail" is Cloudflare telling us this token is no good — refuse it. "unavailable"
 * is our own verifier being unreachable or answering with something that is not
 * JSON, which is not the sender's fault and must not cost them their submission.
 * Collapsing those two into false is how an outage at our end turns into a
 * closed door at theirs.
 */
export async function verifyTurnstile(token, secret, remoteip) {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteip) body.append("remoteip", remoteip);

  let result;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    if (!response.ok) return "unavailable";
    result = JSON.parse(await response.text());
  } catch {
    return "unavailable";
  }
  return result?.success === true ? "pass" : "fail";
}

/** Case ids come from the URL, so keep them to the same shape the front end generates. */
export function parseCaseId(value) {
  if (!isNonEmptyString(value, 120)) throw new TypeError("A case reference is required.");
  const caseId = value.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(caseId)) throw new TypeError("That case reference is not valid.");
  return caseId;
}

export async function clientIpHash(context) {
  const clientIp = context.request.headers.get("CF-Connecting-IP") ?? "unknown";
  return hash(clientIp, context.env.SUBMISSION_HASH_SALT);
}

/** The token the local dev bypass expects. Worthless anywhere else. */
export const LOCAL_HUMAN_TOKEN = "local-dev-bypass";

/**
 * True only for `wrangler pages dev`, which serves on loopback. Cloudflare Pages
 * is never reached on a loopback hostname, so this cannot be turned on in
 * production by setting a variable: the host itself has to be localhost.
 */
export function isLoopbackRequest(request) {
  try {
    const { hostname } = new URL(request.url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
  } catch {
    return false;
  }
}

export async function requireReviewer(context) {
  // Cloudflare Access cannot issue a JWT to a local dev server, so there would
  // otherwise be no way to rehearse the review flow before going live. Requires
  // BOTH a loopback host and an explicitly set DEV_REVIEWER_EMAIL.
  if (isLoopbackRequest(context.request) && context.env.DEV_REVIEWER_EMAIL) {
    return String(context.env.DEV_REVIEWER_EMAIL).trim().toLowerCase();
  }

  // Solo-operator fallback when Cloudflare Access is not wired yet. The secret
  // lives only in Pages secrets; the browser sends it in a header after a
  // one-time prompt on /review/. Prefer Access once it is configured.
  const expectedSecret = String(context.env.ADMIN_REVIEW_SECRET ?? "");
  const providedSecret = context.request.headers.get("X-Review-Secret") ?? "";
  if (expectedSecret.length >= 16 && providedSecret === expectedSecret) {
    const allowed = (context.env.REVIEWER_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    return allowed[0] ?? "reviewer";
  }

  const accessAssertion = context.request.headers.get("CF-Access-Jwt-Assertion");
  const email = accessAssertion ? await verifiedAccessEmail(accessAssertion, context.env) : null;
  const allowed = (context.env.REVIEWER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!email || allowed.length === 0 || !allowed.includes(email.toLowerCase())) {
    return null;
  }
  return email;
}

export function publicCase(caseData, id) {
  if (!caseData || typeof caseData !== "object" || Array.isArray(caseData)) {
    throw new TypeError("Published case data must be an object.");
  }

  const requiredStrings = ["date", "cat", "sev", "title", "stamp", "what", "dodge", "alt"];
  for (const key of requiredStrings) {
    if (!isNonEmptyString(caseData[key], 20_000)) {
      throw new TypeError(`Published case field "${key}" is required.`);
    }
  }
  if (!["red", "amber"].includes(caseData.sev)) throw new TypeError("Severity must be red or amber.");
  if (!isValidCategory(caseData.cat)) throw new TypeError("Published case category must be one of the ledger categories.");
  if (!Number.isInteger(caseData.sk) || !Number.isInteger(caseData.year)) {
    throw new TypeError("Published case requires integer sk and year fields.");
  }
  if (!caseData.human || !isNonEmptyString(caseData.human.v, 20_000)) {
    throw new TypeError("Published case requires a human.v field.");
  }
  if (!caseData.cost || !isNonEmptyString(caseData.cost.v, 20_000)) {
    throw new TypeError("Published case requires a cost.v field.");
  }
  if (!Array.isArray(caseData.ministers) || caseData.ministers.length === 0) {
    throw new TypeError("Published case requires at least one minister or office-holder.");
  }
  if (!Array.isArray(caseData.sources) || caseData.sources.length === 0) {
    throw new TypeError("Published case requires at least one source.");
  }

  const estimates = caseData.estimates ?? {};
  for (const key of ["costInrCrore", "deaths"]) {
    if (key in estimates && (!Number.isFinite(estimates[key]) || estimates[key] <= 0)) {
      throw new TypeError(`Estimate "${key}" must be a positive number.`);
    }
  }

  return { ...caseData, id };
}
