# Rehearsing the submission flow locally

Run the whole loop — submit, review, publish, verify on the ledger, unpublish,
erase — on your own machine, before anything is live. Nothing here touches the
production database.

## Why this needs a local run

Two things cannot work on a static preview:

- **Turnstile** only renders on the hostnames listed in its dashboard, and
  `localhost` is never one of them. `ALLOW_LOCAL_TURNSTILE_BYPASS=true` skips the
  challenge entirely on a loopback host; the API accepts a sentinel token only
  under the same two conditions. `wrangler.jsonc` pins a live site key in `vars`,
  so this bypass is what makes local testing work regardless of that.
- **Cloudflare Access** cannot issue a JWT to a dev server, so the reviewer API
  would reject you. `DEV_REVIEWER_EMAIL` stands in, and only on a loopback host.

## Setup, once

```bash
npm install                      # installs wrangler
cp .dev.vars.example .dev.vars   # test keys are already filled in
npm run db:migrate:local         # creates the local D1 tables
```

`.dev.vars` is gitignored. Leave the two Turnstile test keys as they are for
local work; they are public values published by Cloudflare.

## Run it

```bash
npm run dev
```

That builds `dist/` and serves it at <http://localhost:8788> with the Functions
and a local D1. Use `localhost`, not `127.0.0.1`, and not a LAN IP — the reviewer
bypass only recognises loopback hostnames.

## The walkthrough

### 1. Submit

Open <http://localhost:8788/submit/>.

The button should be solid red with a normal pointer cursor, and the note
underneath should read *"Local development: human verification is bypassed on this
host."* If it is greyed with a *not-allowed* cursor, read the line underneath — it
names the fault, including the hostname and whether the site key is a live one.

Fill everything in. For sources use a URL that resolves, e.g.
`https://www.tribuneindia.com/`. There is no challenge to solve locally, so press
**Submit for review**.

Expect: *"Submitted. An editor will review the evidence before any publication
decision."*

Confirm it landed:

```bash
npx wrangler d1 execute public-submission --local \
  --command "SELECT id, status, title FROM submissions ORDER BY created_at DESC LIMIT 5"
```

### 2. Review

Open <http://localhost:8788/review/>. It loads without an Access prompt because
of the local bypass.

Queue **pending** → pick your submission. You will see the submitted text, the
source URLs, and a **Published case JSON** box seeded from what you sent.

Open every source link. That is the actual job.

### 3. Publish

Edit the JSON so it passes validation. Minimum viable case:

```json
{
  "no": 900,
  "sk": 20240115,
  "year": 2024,
  "date": "15 Jan 2024",
  "cat": "Public safety",
  "sev": "amber",
  "title": "Test case, please delete",
  "stamp": "Testing only",
  "human": { "v": "A test entry", "est": false },
  "cost": { "v": "No real figure", "est": false },
  "what": "A test submission used to rehearse the review flow.",
  "dodge": "Nothing was dodged; this is a test.",
  "ministers": [{ "n": "Test office", "r": "Test role" }],
  "pos": "No position; this is a test.",
  "alt": "Delete this case once the flow has been verified.",
  "sources": [{ "label": "Tribune", "url": "https://www.tribuneindia.com/", "tier": 2 }]
}
```

`cat` must be one of the categories the validator accepts and `sev` must be
`red` or `amber`. Press **Publish to ledger**. Expect *"Marked published."*

A malformed publish changes nothing and tells you which field failed.

### 4. Verify it is live

```bash
curl -s http://localhost:8788/api/cases | head -c 400
```

Then open <http://localhost:8788/> — the case appears in its year section
alongside the static ones. Check <http://localhost:8788/dashboard/> too: the
office-holder you named now has a row and a CV.

This is the part worth confirming, because published submissions are served from
D1 at runtime. They appear **without a redeploy**, which also means a bad publish
is live instantly.

### 5. Unpublish (the reversible route)

Queue **published** → select the case → **Unpublish, keep approved**.

```bash
curl -s http://localhost:8788/api/cases      # the case is gone
```

The submission and your review notes survive. This is what to reach for when
something needs correcting.

### 6. Erase (the irreversible route)

Queue **approved** → select it → **Erase permanently** → confirm.

```bash
npx wrangler d1 execute public-submission --local \
  --command "SELECT COUNT(*) AS submissions FROM submissions"
npx wrangler d1 execute public-submission --local \
  --command "SELECT COUNT(*) AS published FROM published_cases"
```

Both should be zero if that was your only submission.

## Reset between runs

```bash
rm -rf .wrangler/state       # wipes the local D1 entirely
npm run db:migrate:local
```

## Before going live

- [ ] Replace both Turnstile keys with a real widget's, and add every hostname it
      serves — apex, `*.pages.dev`, and any preview domain.
- [ ] Set `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `SUBMISSION_HASH_SALT`,
      `REVIEWER_EMAILS`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` on the Pages
      project.
- [ ] **Do not** set `DEV_REVIEWER_EMAIL` or `ALLOW_LOCAL_TURNSTILE_BYPASS` in
      production. Both are ignored off loopback, but neither has any reason to
      exist there.
- [ ] Add every hostname the site serves to the Turnstile widget: the apex
      domain, `*.pages.dev`, and any preview domain. A missing hostname is what
      makes the form fail with no obvious cause.
- [ ] Apply migrations to the real database: `npm run db:migrate:remote`.
- [ ] Add Cloudflare Access policies for `/review/*` and `/api/admin/*`.
- [ ] Confirm `https://<your-site>/api/public-config` returns JSON. If it returns
      HTML, the Functions are not deployed and every form will fail.
