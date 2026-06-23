# Current Work

Reviewed: 2026-06-23

## Ready To Commit

- Publish package metadata points to `data/license-matrix.json` with record-only license/provenance notes.
- `tools/publish-audit.mjs` validates retained translations, package metadata, license rows, missing removed-data directories, linked planning docs, and absence of legacy source naming without release gating on license values.
- Study-feature restoration docs are additive planning material only and do not change packaged data policy.

## Still Needed

1. Add tests for crossrefs/commentary/outlines/interlinear/search and analysis-word-map/analysis-graph loading paths.
2. Keep the analysis generator reproducible by preserving chunked runs (`tools/generate-analysis-packs.mjs`).
3. Split tests into publish-package and full-study modes so optional datasets can be validated independently.
4. Keep reader-adjacent study tools visible and guided; avoid regressing to hidden/disabled-only states.

## Verification Command

```powershell
node .\app\tools\publish-audit.mjs
```
