# Application Package

This directory contains the static Bible App and its runtime data.

- `index.html`, `app.js`, and `styles.css` form the browser entry point.
- `src/` contains routing, rendering, persistence, semantic, and study-view
  modules.
- `data/` contains Bible texts, study datasets, local search indexes, and
  generated analysis packs.
- `schemas/`, `scripts/`, and `tools/` contain validation, browser tests, and
  deterministic data tooling.

Run and verify the application from the repository root:

```powershell
npm run serve
npm run verify
```

Bundled-data provenance is recorded in `data/source-manifest.json`. The root
`NOTICE.md` preserves source-specific notices.
