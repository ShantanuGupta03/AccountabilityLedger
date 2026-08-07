# Reviewing submissions

How reader submissions reach the ledger, and how to take them back off it.

Nothing a reader sends appears on the public site on its own. A submission lands
in a private queue and only becomes a case when a reviewer publishes a completed
case record. Publishing is a separate, deliberate act from receiving.

## Where things live

| What | Where |
| --- | --- |
| Public submission form | `/submit/` |
| Public "suggest a source" form | `/corrections/?case=<id>#sources` |
| Reviewer console | `/review/` — Cloudflare Access protected |
| Submission API (public POST) | `functions/api/submissions/index.js` |
| Admin API | `functions/api/admin/submissions/` |
| Published-case feed the site reads | `/api/cases` |

Published submissions are served live from D1 through `/api/cases`, so they
appear on the ledger and the minister dashboard **without a redeploy**. The 87
cases in `assets/data/cases.json` are the static set and are separate.

## Getting access

`/review/` is protected by Cloudflare Access, and the API checks the Access JWT
*and* the email allowlist. Both must be right:

1. Cloudflare Access → add your email to the policy for `/review/` and
   `/api/admin/*`.
2. Set `REVIEWER_EMAILS` (comma-separated) on the Pages project.
3. Set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` so the JWT can be verified.

If `REVIEWER_EMAILS` is empty, every admin call returns 403 — an unset
allowlist denies everyone rather than allowing everyone. That is deliberate.

## Reviewing a submission

1. Open `/review/` and pick a queue: **pending**, **approved**, **published** or
   **rejected**.
2. Choose a submission. The panel shows the submitter's text and their source
   URLs. **Open every source before you go further.** The ledger's whole claim is
   that its links check out.
3. Edit the **Published case JSON**. For a new submission this is seeded from a
   template built out of what the reader sent; for something already live it is
   the exact JSON the public is reading, so you are editing the real thing.
4. Write **review notes** — these are private and are stored against the
   submission for the audit trail.
5. Press a decision button.

### What each decision does

| Button | Effect |
| --- | --- |
| **Publish to ledger** | Validates the JSON, writes it to `published_cases`, sets status `published`. Live immediately on `/api/cases`. |
| **Keep approved** | Marks it good enough to publish, publishes nothing. From the published queue this **unpublishes** — the live case is removed. |
| **Reject** | Marks it rejected. From the published queue this also unpublishes. |
| **Erase permanently** | Deletes the submission *and* anything it published. Irreversible. |

The button labels change with the queue you are in, because "approved" means
"promote this" from the pending queue and "take this down" from the published
one. Read the label, not the position.

### The JSON must pass validation

`publicCase()` in `functions/_utils.js` rejects the publish outright unless:

- `date`, `cat`, `sev`, `title`, `stamp`, `what`, `dodge`, `alt` are all non-empty
- `sev` is exactly `red` or `amber`
- `sk` and `year` are integers (`sk` is the `YYYYMMDD` sort key)
- `human.v` and `cost.v` are non-empty
- `ministers` has at least one entry
- `sources` has at least one entry
- any `estimates.costInrCrore` / `estimates.deaths` are positive numbers

A malformed publish fails with the reason in the status line and changes
nothing. You cannot half-publish a case.

Match the shape of an existing case in `assets/data/cases.json` and keep the
editorial rules: state facts as facts, put anything contested in `alleg`
attributed to whoever alleged it, record the government's answer in `pos`, and
tag estimates with `est: true`.

## Taking something down

Two different things, and the difference matters:

- **Unpublish** (reversible): from the published queue, press *Unpublish, keep
  approved* or *Unpublish and reject*. The row in `published_cases` is deleted so
  the case leaves `/api/cases` at once, but the submission and your notes remain.
  Use this for a factual problem, a correction, or a case that needs more work.
- **Erase permanently** (irreversible): the *Erase permanently* button deletes
  the submission row and any published case together. It asks for confirmation
  first. Use this only when the stored copy itself has to go — a legal demand, or
  private personal data a reader should not have sent.

Prefer unpublishing. It is reversible, it keeps the audit trail, and it takes the
case off the public site just as fast.

## Suggested sources

Reader-suggested sources for existing cases run through the same console, lower
down the page, with their own queue and their own approve/reject/erase actions.
Approved suggestions surface on the case card marked *added by a reader*, so they
are visibly distinct from sources the ledger vetted itself.

## If the submit button is dead

The form deliberately refuses to pretend. A greyed button with a
**not-allowed** cursor plus a red line underneath means the form cannot be used,
and the line says why:

- *"Submissions are switched off because this site is not fully configured"* —
  it names the missing variables. Set them on the Pages project.
- *"Human verification could not load"* — the Turnstile script was blocked,
  usually by an extension or a network filter.
- *"Human verification did not render... live Turnstile key... on <host>"* — the
  widget does not list that hostname. Add it in the Turnstile dashboard,
  including preview domains. For local work set
  `ALLOW_LOCAL_TURNSTILE_BYPASS=true` in `.dev.vars` instead.
- *"The submission API did not respond"* — the Pages Functions are not deployed.
  Check that `https://<site>/api/public-config` returns JSON rather than HTML.

A **wait** cursor means one thing only: a request is in flight right now. If you
see a wait cursor before you have clicked anything, that is a bug — report it.
