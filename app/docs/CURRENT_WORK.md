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
| Static suite | Passing | Includes seven maintained domain suites, ten recovery scenarios, package inventory drift, module identity, accessibility, and documentation checks. |
| Documentation consistency | Passing | Included in the static suite. |
| Manual desktop browser QA | Passing for exercised flows | On 2026-07-01, Psalms 14 and John 4 exercised Strong's lock/reset, Search navigation, panel history, stale-panel reset, Interlinear lazy loading, long-token wrapping, source-token Tags history, corrected `because` rendering, dark theme, and console health. |
| In-app Browser tag QA | Passing for exercised flow | On 2026-06-30, John 4 Interlinear source-token tagging, badge persistence/editing, dark-theme layout, corrected `because` rendering, and console health passed. Direct drag selection could not be synthesized by the Browser controller. |
| Automated desktop browser suite | Passing twice consecutively | Maintained Playwright/Edge suite covers reader, study, Favorites, tags, jobs, persistence, search, and hostile commentary markup. |
| Automated mobile browser suite | Passing twice consecutively | The same journey passes with touch/mobile emulation and overflow assertions. |
| Package inventory | Passing | Twenty-five packs, language-specific Interlinear counts, raw/gzip bytes, hashes, and largest shards are drift-checked. |
| `npm run verify` | Passing | Full static, domain, inventory, desktop, mobile, and structural package checks pass. |

The root `MASTER_STATUS_TRACKER.md` is the repository-wide task source of truth. The 2026-07-01 detailed health evidence is recorded in `FULL_APP_HEALTH_AUDIT.md`.

## Known documentation and package follow-up

1. `LICENSES.md` and the license matrix contain provenance/status language that requires a dedicated legal/data review before public or commercial distribution.
2. The deterministic inventory establishes package presence and size, not legal clearance.
3. Screenshot-diff baselines remain deferred until the visual design stabilizes.
4. Hebrew interlinear `original` token fields contain transliteration rather than Hebrew script in the sampled first token for all 39 Old Testament books.
5. Minimum-reader versus optional-study distribution and route-level performance budgets remain undefined.

## Next implementation boundary

Before continuing feature expansion, complete the release-health gates:

1. Complete external package/license source-chain review.
2. Define Hebrew source-text/token alignment, then restore actual Hebrew Unicode token originals.
3. Define minimum-reader versus optional-study distribution and performance budgets.

After those gates, continue Phase 3 with contiguous source-token-span selection and ambiguous-anchor review.

## Verification commands

```powershell
npm run test:static
npm run test:browser
npm run test:browser:mobile
npm run audit
```

`npm run verify` is the release-validation entry point. Legal approval remains separate from this technical command.
