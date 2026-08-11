# Accountability Ledger - Structured Version

## Structure

```text
accountability-ledger-structured/
├── index.html
├── 404.html
├── _headers
├── README_DEPLOY.md
├── migrations/
│   └── 0001_submissions.sql
├── docs/
│   ├── REVIEWING.md
│   └── TESTING-SUBMISSIONS.md
├── functions/
│   └── api/
├── dashboard/
├── review/
├── submit/
├── wrangler.jsonc
└── assets/
    ├── css/
    │   └── styles.css
    ├── data/
    │   └── cases.json
    └── js/
        └── app.js
```

- Edit page wording and structure in `index.html`.
- Edit visual design in `assets/css/styles.css`.
- Edit case records only in `assets/data/cases.json`. Keep it valid JSON.
- Edit filtering, sorting, interactions, and safe data rendering in `assets/js/app.js`.
- `_headers` supplies the Cloudflare Pages security headers.
- `functions/` contains the submission API, review queue API, and public published-case API.
- `migrations/` contains the Cloudflare D1 schema.

## Header estimates

The two headline estimates are calculated from optional per-case `estimates` values in `assets/data/cases.json`:

```python
"estimates": {
  "costInrCrore": 200000,
  "deaths": 100
}
```

- `costInrCrore` is a broad, cumulative financial estimate in Indian crore.
- `deaths` is an estimated death toll.
- Omit either field when a case has no defensible figure. Do not use `0` as an estimate.
- The displayed totals include disputed and range-based figures, may overlap between cases, and are not an audited loss or fraud total.

## Test locally

```text
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Serves the built site with the API and a local D1 at <http://localhost:8788>.
`.dev.vars.example` ships with Cloudflare's public Turnstile *test* keys so the
submission flow works locally without a real widget.

`docs/TESTING-SUBMISSIONS.md` walks through the whole loop — submit, review,
publish, verify, unpublish, erase — which is worth doing once before going live.

## Deploy

The ledger is no longer static-only: public submissions and moderation use Cloudflare Pages Functions and D1. Direct Upload cannot deploy this backend; deploy with Wrangler or connect the repository to Cloudflare Pages.

1. Create a D1 database:

```text
npx wrangler d1 create accountability-ledger
```

2. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc`, then apply the schema:

```text
npx wrangler d1 migrations apply accountability-ledger --remote
```

3. Create a Turnstile widget for the submission page domain. Set these on the **Cloudflare Pages project → Settings → Environment variables** for **Production** (encrypted where noted), then **redeploy** — secrets do not bind to a running deployment until the next deploy:

| Name | Type | Purpose |
| --- | --- | --- |
| `TURNSTILE_SITE_KEY` | Plain text | Turnstile widget (also in `wrangler.jsonc`) |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile verification |
| `SUBMISSION_HASH_SALT` | Secret | Rate-limit hashing |
| `REVIEWER_EMAILS` | Plain text | Your admin email (comma-separated). **Not** the public contact address. |
| `ADMIN_REVIEW_SECRET` | Secret | 16+ characters; unlocks `/review/` until Access is wired |
| `CF_ACCESS_TEAM_DOMAIN` | Plain text | Optional; for Cloudflare Access |
| `CF_ACCESS_AUD` | Plain text | Optional; Access application audience |

Never commit secret values or `.dev.vars`. `wrangler.jsonc` `vars` are not enough when the repo deploys through Git — set everything above in the dashboard.

4. Configure Cloudflare Access policies before deployment:
   - `/review/*`
   - `/api/admin/*`

   Allow only the email addresses listed in `REVIEWER_EMAILS`. The API verifies the Cloudflare Access JWT and the allowlisted email.

5. Deploy the **build output**, not the repository root:

```text
npm run deploy
```

`wrangler.jsonc` sets `pages_build_output_dir` to `./dist`, so `dist/` is what
Cloudflare serves and `dist/functions/` is where it looks for the API.
`scripts/build.mjs` copies `functions/` across and then fails the build if the
API is missing, because a deploy without it 404s every form and the published-case
feed while the static pages look perfectly healthy.

If the repository is connected to Cloudflare Pages for automatic deployments, set
the build command to `npm run build` and the output directory to `dist`.

See `docs/REVIEWING.md` for the reviewer workflow: publishing, unpublishing and erasing submissions.

Public visitors can submit an incident only to the pending review queue. It is not public and cannot appear in the ledger until an Access-protected reviewer publishes a completed case record. Published submissions are served read-only through `/api/cases`.

Protect the deployment account as the write boundary:

1. Enable MFA on the Cloudflare account.
2. Give project/deployment access only to trusted maintainers.
3. Keep the source in a private Git repository and deploy from reviewed commits when possible.
4. Revoke access for former maintainers and avoid sharing account credentials.

The included headers restrict scripts, frames, browser capabilities, and data connections. Cloudflare Pages applies `_headers` only after deployment; verify them in the deployed site's response headers.
