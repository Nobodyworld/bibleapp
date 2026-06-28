# Current Work

Reviewed: 2026-06-28

## Current Verification

- `npm test` validates JavaScript syntax, all packaged JSON, declared npm-script paths, retained datasets, capability paths and dependencies, all analysis book files, accessibility contracts, documentation consistency, and 24 desktop / 25 mobile browser interactions.
- `npm run audit` validates package structure and explicitly does not claim runtime or legal release readiness.
- The browser suite starts an isolated local server and temporary Edge profile, so it does not depend on a separately running development server or retained browser state.

## Still Needed

1. Keep the analysis generator reproducible through chunked runs (`tools/generate-analysis-packs.mjs`).
2. Keep reader-adjacent study tools visible and provide actionable empty states.
3. Add screenshot-diff baselines only when the visual design becomes stable enough to avoid high-churn snapshots.

## Verification Command

```powershell
npm test
npm run audit
```

Use `npm run verify` to run both commands as the release-validation entry point.
