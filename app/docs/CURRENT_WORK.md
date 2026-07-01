# Current Work

Reviewed: 2026-07-01

## Current implementation

- The local reader packages ten translations plus Strong's, lexicon, cross-reference, commentary, footnote, outline, search, interlinear, word-map, and graph data.
- Outline and Interlinear launch from the side panel. They are no longer duplicated in the chapter tool group.
- Interlinear verse inspection loads the selected verse first and appends the next verse near the bottom of the detail-panel scroll container.
- Reader and interlinear tokens follow each other by verse and token index. Strong's is only a uniqueness fallback.
- Explicit panel actions lock the selected panel; disengage, clear, or navigation returns it to follow mode.
- Active and hovered reference contexts are separate and use the translation-to-word hierarchy documented in `UI_FUNCTIONALITY_SCHEMA.md`.
- Verse tags, custom tag management, semantic assertions, local jobs, export/import, and graph projection exist.
- Favorite controls exist for the current book, current chapter, verse rows, verse context tabs, and exact Interlinear source tokens. The Favorites panel groups every supported target type.
- Interlinear source-token cards expose a target-aware tag editor, persistent editable badges, and canonical source-token assertions.
- Reader selections use exact rendered character boundaries, create canonical text-span targets, and expose favorite/tag actions, highlights, and editable badges.
- Text-span snapshots render at their original range or one unique relocated range. Ambiguous/unresolved snapshots are not attached to potentially wrong text.
- All versioned runtime imports share one release key. Stateful `dom.js` and `stores.js` imports are tested as singleton module URLs so panel history and persistence state cannot split across query-string module instances.
- Translation, book, and chapter navigation clears stale detail content and panel history while preserving reader-location Back/Forward history.
- Contiguous source-token-span selection is the remaining word/chunk tagging boundary.

## Verification status

| Check | Status | Evidence |
|---|---|---|
| Static suite | Passing | `npm run test:static` passed on 2026-07-01, including module-singleton and navigation-reset regressions. |
| Documentation consistency | Passing | Included in the static suite. |
| Manual desktop browser QA | Passing for exercised flows | On 2026-07-01, Psalms 14 and John 4 exercised Strong's lock/reset, Search navigation, panel history, stale-panel reset, Interlinear lazy loading, long-token wrapping, source-token Tags history, corrected `because` rendering, dark theme, and console health. |
| In-app Browser tag QA | Passing for exercised flow | On 2026-06-30, John 4 Interlinear source-token tagging, badge persistence/editing, dark-theme layout, corrected `because` rendering, and console health passed. Direct drag selection could not be synthesized by the Browser controller. |
| Committed favorite interaction assertions | Implemented, full run blocked | `app/scripts/interaction-test.mjs` covers reader text spans, header/verse-context/source-token favorites and tags, badges, Favorites grouping, panel history, and cleanup. The standalone Edge/CDP runner remains blocked before app navigation. |
| Automated desktop browser suite | Environment-blocked | Edge/CDP fails during `Page.enable` before app navigation in this environment. This is a runner problem, not a passing app result. |
| In-app Browser mobile QA | Environment-blocked | The Browser controller blocked further localhost actions after the desktop pass. No mobile result is claimed. |
| Automated mobile browser suite | Environment-blocked | The Edge/CDP startup boundary prevents a reliable automated mobile result. |
| `npm test` / `npm run verify` | Not currently green | Both include the blocked browser suites. |

The 2026-07-01 full health review is recorded in `FULL_APP_HEALTH_AUDIT.md`. It is the active release-health and remediation task list.

## Known documentation and package follow-up

1. `data/package-manifest.json` declares restored study packs, but several large restored pack entries still report zero files/bytes. Regenerate package counts before treating the manifest as release metadata.
2. `LICENSES.md` and the license matrix contain provenance/status language that requires a dedicated legal/data review before public or commercial distribution.
3. Browser automation needs a stable Edge/CDP launch path; manual browser QA does not replace that regression suite.
4. Screenshot-diff baselines remain deferred until the visual design stabilizes.
5. Nineteen of twenty-one package-manifest rows have stale file or byte counts.
6. Footnotes and other restored datasets are present at runtime while `LICENSES.md` still describes them as absent.
7. Eleven executable test files are outside the default static suite; direct execution exposed stale contracts and five failing recovery scenarios.
8. Hebrew interlinear `original` token fields contain transliteration rather than Hebrew script in the sampled first token for all 39 Old Testament books.
9. Commentary HTML is inserted without an allowlist sanitizer or CSP.

## Next implementation boundary

Before continuing feature expansion, complete the release-health gates:

1. Reconcile package/license inventory and regenerate package counts.
2. Restore a green desktop/mobile browser runner.
3. Reconcile orphaned tests and fix or explicitly migrate the failing recovery contracts.
4. Add CI enforcement.

After those gates, continue Phase 3 with contiguous source-token-span selection and ambiguous-anchor review.

## Verification commands

```powershell
npm run test:static
npm run test:browser
npm run test:browser:mobile
npm run audit
```

`npm run verify` is the intended release-validation entry point, but it must not be reported as passing until both browser commands complete successfully.
