# Current Work

Reviewed: 2026-06-29

## Current implementation

- The local reader packages ten translations plus Strong's, lexicon, cross-reference, commentary, footnote, outline, search, interlinear, word-map, and graph data.
- Outline and Interlinear launch from the side panel. They are no longer duplicated in the chapter tool group.
- Interlinear verse inspection loads the selected verse first and appends the next verse near the bottom of the detail-panel scroll container.
- Reader and interlinear tokens follow each other by verse and token index. Strong's is only a uniqueness fallback.
- Explicit panel actions lock the selected panel; disengage, clear, or navigation returns it to follow mode.
- Active and hovered reference contexts are separate and use the translation-to-word hierarchy documented in `UI_FUNCTIONALITY_SCHEMA.md`.
- Verse tags, custom tag management, semantic assertions, local jobs, export/import, and graph projection exist. Target-aware tags and favorites are not implemented yet.

## Verification status

| Check | Status | Evidence |
|---|---|---|
| Static suite | Passing | `npm run test:static` passed on 2026-06-29. |
| Documentation consistency | Passing | Included in the static suite. |
| Manual desktop browser QA | Passing for exercised flows | Reader navigation, Outline, Interlinear, lazy loading, Strong's panel history, dark Hebrew contrast, and console health were exercised on 2026-06-29. |
| Automated desktop browser suite | Environment-blocked | Edge/CDP fails during `Page.enable` before app navigation in this environment. This is a runner problem, not a passing app result. |
| Automated mobile browser suite | Environment-blocked | The same Edge/CDP startup boundary prevents a reliable mobile result. |
| `npm test` / `npm run verify` | Not currently green | Both include the blocked browser suites. |

## Known documentation and package follow-up

1. `data/package-manifest.json` declares restored study packs, but several large restored pack entries still report zero files/bytes. Regenerate package counts before treating the manifest as release metadata.
2. `LICENSES.md` and the license matrix contain provenance/status language that requires a dedicated legal/data review before public or commercial distribution.
3. Browser automation needs a stable Edge/CDP launch path; manual browser QA does not replace that regression suite.
4. Screenshot-diff baselines remain deferred until the visual design stabilizes.

## Next implementation boundary

Begin Phase 1 of `TAG_FAVORITES_ANALYSIS_ROADMAP.md`:

1. Add versioned, target-aware tag assertion APIs while preserving existing verse tags.
2. Add separate user-inquiry and textual-question semantics.
3. Add `tag:favorite` and definition-driven tag behavior metadata.
4. Add migration, export/import, and idempotent job-trigger tests before adding new UI.

## Verification commands

```powershell
npm run test:static
npm run test:browser
npm run test:browser:mobile
npm run audit
```

`npm run verify` is the intended release-validation entry point, but it must not be reported as passing until both browser commands complete successfully.
