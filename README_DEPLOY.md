# Accountability Ledger - Structured Version

## Structure

```text
accountability-ledger-structured/
├── index.html
├── 404.html
├── _headers
├── README_DEPLOY.md
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

```python
python3 -m http.server 8000
```

Open `http://localhost:8000` and stop the server with `Ctrl+C`.

## Deploy

Upload the complete folder or deployment ZIP to Cloudflare Pages using Direct Upload.

This is a read-only static site: visitors can read the case JSON but there is no browser-accessible endpoint that can change it. To update a case, edit the local `assets/data/cases.json` file and deploy a new version.

Protect the deployment account as the write boundary:

1. Enable MFA on the Cloudflare account.
2. Give project/deployment access only to trusted maintainers.
3. Keep the source in a private Git repository and deploy from reviewed commits when possible.
4. Revoke access for former maintainers and avoid sharing account credentials.

The included headers restrict scripts, frames, browser capabilities, and data connections. Cloudflare Pages applies `_headers` only after deployment; verify them in the deployed site's response headers.
