const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};
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

export async function requireReviewer(context) {
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
