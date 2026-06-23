# Current Work

Reviewed: 2026-06-22

## Ready To Commit

- Publish package metadata now points to `data/license-matrix.json`.
- Retained-data licensing is documented in `LICENSES.md` and machine-readable in `data/license-matrix.json`.
- `tools/publish-audit.mjs` validates retained translations, package metadata, license rows, missing removed-data directories, linked planning docs, and absence of legacy source naming.
- Study-feature restoration docs are additive planning material only and do not change packaged data policy.

## Still Needed

1. Decide whether to keep the repository private indefinitely or prepare a public/commercial release checklist for non-US distribution review.
2. Review each `allowed_us` translation row before non-US publication or sale, especially KJV jurisdiction restrictions.
3. Convert missing-study-data copy recommendations into runtime UI changes after the publish/license baseline is committed.
4. Split tests into publish-package and full-study modes so current package checks do not depend on absent study datasets.
5. Restore study datasets only through source-specific license review and a matching `license-matrix.json` row.
6. Keep reader-adjacent study tools visible and guided; do not treat the current license-scoped package as a text-only product direction.

## Verification Command

```powershell
node .\app\tools\publish-audit.mjs
```
