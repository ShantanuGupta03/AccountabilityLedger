import { json } from "../_utils.js";

const REQUIRED = ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "SUBMISSION_HASH_SALT"];

export function onRequestGet(context) {
  const missing = REQUIRED.filter((name) => !context.env[name]);
  const siteKey = context.env.TURNSTILE_SITE_KEY;
  if (!siteKey) return json({ submissionsEnabled: false, missing });
  return json({ submissionsEnabled: true, turnstileSiteKey: siteKey, missing });
}
