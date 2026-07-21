import { json } from "../_utils.js";

export function onRequestGet(context) {
  const siteKey = context.env.TURNSTILE_SITE_KEY;
  if (!siteKey) return json({ submissionsEnabled: false });
  return json({ submissionsEnabled: true, turnstileSiteKey: siteKey });
}
