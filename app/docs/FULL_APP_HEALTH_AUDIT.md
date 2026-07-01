# Full App Health Audit

Reviewed: 2026-06-30

## Executive verdict

Overall status: **healthy for continued local development, not release-ready**.

The core reader, packaged study capabilities, local semantic model, and static data checks are substantial and functional. The main risks are outside the basic reading flow: release metadata is inaccurate, licensing documentation contradicts the packaged runtime, the official browser verification command is not green, multiple executable tests are excluded from the default suite and have drifted, and Hebrew interlinear token records do not contain Hebrew script in the field presented as the original word.

Do not describe the app as fully verified or distribution-ready until the P0 release gates in this document are complete.

## Audit scope

This review covered:

- repository and architecture inventory;
- git state and recent implementation history;
- static JavaScript and JSON integrity;
- capability, analysis, interlinear, tag, reference-context, accessibility, and documentation tests;
- the package publishing audit;
- desktop runtime rendering, console health, and Hebrew interlinear lazy loading;
- official desktop/mobile test orchestration;
- user-data recovery and other test files not included in the default suite;
- packaged-data size, manifest accuracy, and licensing/provenance consistency;
- security-sensitive rendering and local persistence boundaries;
- current planning and status documentation.

## Evidence summary

| Area | Result | Evidence |
|---|---|---|
| Git baseline | Pass | `main` matched `origin/main` at audit start. |
| Static suite | Pass | 70 JavaScript files and 2,810 JSON files checked; all configured static suites passed. |
| Capability model | Pass | All 8 declared runtime capabilities reported available. |
| Analysis data | Pass | Word-map and graph data validated for all 66 books. |
| Tag/favorite model | Pass in configured tests | 7 target types, migrations, favorites, inquiry job, and graph projection assertions passed. |
| Initial desktop runtime | Pass for exercised route | Psalms 14 rendered with meaningful content and no framework overlay. |
| Browser console | Pass for exercised route | No warning or error entries were reported. |
| Interlinear runtime | Pass for exercised Hebrew verse | Psalms 14:1 loaded lazily and rendered 13 token cards. |
| Official release command | Fail | `npm run verify` stops in `test:browser` at Edge/CDP `Page.enable`. Mobile never runs. |
| Package audit | Conditional pass | Structure passes, but the tool reports `license_review_required: true` and does not check runtime readiness. |
| Additional executable tests | Fail/drifted | 11 test files are not included in `test:static`; only `job-processor-test.mjs` passed when run directly. |
| Mobile visual QA | Not completed in this run | Further localhost navigation was blocked by the Browser controller after the desktop checks. |

## Health scorecard

| Domain | State | Assessment |
|---|---|---|
| Core reader and study UI | Green | The exercised reader, side panel, theme, and interlinear flow rendered correctly. |
| Packaged capability/data presence | Green | Required book-level artifacts exist and configured integrity checks pass. |
| Semantic tags and favorites | Green/Yellow | Core schema and current UI exist; source-token spans, anchor review, richer inquiry results, and graph UI remain planned. |
| Persistence and recovery | Yellow/Red | Main tests pass, but the excluded recovery suite has 5 failing scenarios. |
| Automated browser regression | Red | The intended desktop/mobile release suites do not start reliably. |
| Release metadata and licensing | Red | Package counts are inaccurate and licensing documents contradict actual packaged/runtime data. |
| Security hardening | Yellow | Local-first architecture limits exposure, but commentary HTML is inserted unsanitized and no CSP is declared. |
| Performance/distribution | Yellow | Runtime data is sharded/lazy, but the packaged data directory is approximately 919.68 MB without an enforced size budget. |
| Accessibility | Yellow/Green | Strong static coverage exists; complete mobile, zoom, focus-restoration, and rendered assistive QA remains outstanding. |
| Documentation | Yellow | Active roadmap documents are useful, but several status/license statements have drifted from the code and packaged files. |

## Findings and solutions

### P0-1: The release verification command is not green

**Problem**

`npm run verify` passes its static phase and then fails before app navigation:

```text
Timed out waiting for CDP response: Page.enable
```

The failure reproduced with debug output. `npm run test:browser:mobile` is therefore not reached.

**Impact**

- Interaction assertions exist but cannot protect releases.
- Desktop and mobile regressions can merge while `test:static` remains green.
- Manual Browser checks cannot replace deterministic CI coverage.

**Solution**

1. Replace the custom raw-CDP launcher with a maintained Playwright test runner, or repair the launcher against the installed Edge version.
2. Separate app-server startup from browser startup diagnostics.
3. Add a small browser bootstrap test before the full interaction suite.
4. Run desktop and mobile projects from one supported configuration.
5. Require both suites in CI before release.

**Acceptance criteria**

- `npm run test:browser` passes twice consecutively.
- `npm run test:browser:mobile` passes twice consecutively.
- `npm run verify` exits zero from a clean checkout.

### P0-2: Licensing/provenance documentation contradicts the package

**Problem**

`app/LICENSES.md` says commentary, cross references, footnotes, interlinear, outlines, generated search, and analysis artifacts are not packaged. They are present under `app/data`; several are loaded by runtime code. The clearest example is footnotes:

- `app/data/footnotes/bsb` contains 66 files.
- `app/data/manifest.json` declares footnotes available.
- `app/src/data-service.js` fetches those files.
- `app/data/license-matrix.json` still lists footnotes as `not_packaged`.

Some Strong's and lexicon records also combine unclear/private-package status language with `allowed` redistribution fields.

**Impact**

- Public or commercial distribution decisions cannot be trusted.
- The current publish audit validates record shape, not legal correctness.
- Data can be shipped without a corresponding reviewed package record.

**Solution**

1. Generate one authoritative inventory directly from `app/data`.
2. Add every runtime-loaded dataset, including footnotes, to the package manifest and license matrix.
3. Reconcile `LICENSES.md`, `license-matrix.json`, and `package-manifest.json`.
4. Require a reviewed distribution decision for each dataset.
5. Make the publish audit fail on unlisted packaged/runtime-loaded datasets and contradictory status fields.

**Acceptance criteria**

- Every `app/data` runtime dataset maps to one reviewed license row.
- No document labels an existing dataset as not packaged.
- Public redistribution and commercial-use fields are internally consistent.
- Legal/data review is recorded separately from automated structural validation.

### P1-1: Package-manifest inventory is materially inaccurate

**Problem**

19 of 21 feature-pack rows disagree with their actual path contents. Examples:

- `crossrefs-basic`: declared 0 files; actual 66 files / 85.36 MB.
- `commentary-verse-index`: declared 0 files; actual 331 files / 203.48 MB.
- `search-verses`: declared 0 files; actual 993 files / 341.10 MB.
- interlinear: declared 0 files; shared path contains 66 files / 68.64 MB.
- translations and lexicons have correct file counts but report zero bytes.

The Hebrew and Greek interlinear packs also point at the same mixed directory, so the current path-only schema cannot calculate language-specific counts accurately.

**Impact**

- Install/download planning and release size reporting are unreliable.
- Package health can appear valid when metadata is stale.
- The current integrity tests only verify manifest shape.

**Solution**

1. Add a deterministic package-manifest generator.
2. Support include filters or separate Hebrew/Greek paths.
3. Record actual bytes and gzip bytes.
4. Add a test that fails on count/size drift and missing declared paths.

### P1-2: Important test files are outside the default suite and have drifted

**Problem**

Eleven `app/scripts/*test.mjs` files are not invoked by `test:static`. Direct execution found:

- job processor: pass;
- recovery scenarios: 5 of 10 scenarios fail;
- contract test: missing/stale text-edition contract;
- package planner/state: references unknown package `reader-bsb-minimal`;
- performance test: references a missing search lexicon shard;
- poll test: references a missing poll-response schema;
- search test: expects a different search-manifest schema;
- semantic test: rejects the now-supported `source_token_span`;
- user-data semantic test: expects an older store version;
- smoke test: assumes a server at port 8765 without starting it.

Some failures are stale fixtures or missing preconditions rather than runtime bugs. That distinction is itself unresolved because these tests are not part of the maintained command.

**Impact**

- Recovery, import, semantic, search, package, and poll regressions are not reliably detected.
- Dead tests create false confidence and maintenance noise.

**Solution**

1. Classify every test as active, replaced, integration-only, or retired.
2. Update active tests to current schemas and fixtures.
3. Make smoke tests start their own server or accept an explicit required URL.
4. Integrate active non-browser tests into `test:static`.
5. Delete superseded tests after their coverage is mapped.

### P1-3: Hebrew interlinear “original” tokens do not contain Hebrew script

**Problem**

A first-token sample across all 39 Old Testament interlinear book files found:

- `language` is `hebrew`;
- the `original` field contains transliteration rather than Hebrew Unicode;
- `original` equals `transliteration`;
- none of the 39 sampled `original` values contain Hebrew script.

This prevents token-level Hebrew letter analysis and verse gematria from running even though the view is inspecting Hebrew data. Hebrew source passages can still appear from separate source-text datasets, but they are not aligned as token originals.

**Impact**

- “Original word” presentation is semantically inaccurate.
- Hebrew letter tooltips and gematria cannot operate on the token records.
- Source-token identity cannot display the actual source form without a lexicon fallback.

**Solution**

1. Rebuild Hebrew interlinear tokens with actual Hebrew Unicode in `original`.
2. Preserve transliteration separately.
3. Validate script against the declared language.
4. Add per-book assertions that Hebrew originals contain Hebrew script and Greek originals contain Greek script.
5. Define how source-text tokens align with BSB/Strong token indexes before regenerating.

### P1-4: Commentary HTML is trusted without sanitization

**Problem**

`app/src/views/commentary-outline-view.js` assigns packaged `commentary_html` directly to `innerHTML`. Current data did not contain obvious script/event-handler payloads in the audit scan, but there is no sanitizer, Trusted Types policy, or Content Security Policy.

**Impact**

A compromised or newly imported commentary dataset could execute markup/script in the application origin and access local user data.

**Solution**

1. Sanitize commentary through a strict allowlist before insertion.
2. Prefer structured text rendering where formatting is not required.
3. Add a CSP appropriate for a static application.
4. Add malicious-fixture tests for scripts, event handlers, unsafe URLs, SVG, and malformed markup.

### P1-5: There is no continuous-integration workflow

**Problem**

No `.github` workflow is present.

**Impact**

Verification depends on a developer remembering to run commands locally. The known browser and orphan-test failures can persist indefinitely.

**Solution**

Add CI for:

1. supported Node version;
2. static/integrity suite;
3. package/license inventory checks;
4. desktop/mobile browser suites after the runner is repaired;
5. artifact-size and documentation-drift checks.

### P1-6: Packaged data size needs an explicit deployment strategy

**Problem**

`app/data` is approximately 919.68 MB across 2,808 files:

| Area | Approximate size |
|---|---:|
| Search | 341.10 MB |
| Commentaries | 203.48 MB |
| Strong's | 114.11 MB |
| Cross references | 85.36 MB |
| Interlinear | 68.64 MB |
| Verse editions | 42.40 MB |
| Lexicons | 31.82 MB |
| Analysis | 25.47 MB |

The runtime uses sharding and lazy fetches, which helps initial rendering, but there is no enforced package-size budget or documented CDN/offline strategy.

**Solution**

1. Measure cold-start requests and bytes by route/capability.
2. Add compressed-size metadata and budgets.
3. Split optional study packs from the minimum reader package.
4. Define caching, versioning, and offline behavior.
5. Avoid loading complete book-level files when a smaller chapter/verse shard is appropriate.

### P2-1: Documentation has semantic drift

**Problem**

- `APP_IMPROVEMENT_ANALYSIS.md` still describes favorites and target-aware tagging as planned.
- `LICENSES.md` describes multiple present datasets as absent.
- Documentation consistency tests verify structure and references but not factual agreement with runtime inventory.

**Solution**

Use this audit and `CURRENT_WORK.md` as active status sources, update historical matrices when feature state changes, and generate inventory sections where possible.

### P2-2: CSS and state modules are carrying concentrated complexity

**Problem**

- `app/styles.css` is approximately 3,300 lines and contains broad cascade overrides.
- `app/src/stores.js` is approximately 1,267 lines.
- `app/scripts/interaction-test.mjs` is approximately 1,154 lines.
- `app/src/chapter-renderer.js` is approximately 762 lines.

Recent dark-theme and sticky-panel regressions came from interactions between broad CSS rules and layout overflow behavior.

**Solution**

1. Split CSS by reader, detail panel, study views, tags, and theme layers.
2. Replace broad dark-mode button selectors with component-level tokens.
3. Split persistence, migration, import/export, and assertion projections into focused modules.
4. Divide browser tests by feature while retaining one smoke journey.
5. Add screenshot baselines after the design settles.

### P2-3: Minor naming and verification debt remains

- `showProverbs` is still the internal identifier for the general translation workspace.
- Full mobile focus restoration, 200% zoom, touch selection, and rendered assistive checks remain incomplete.
- Community graph/sync is intentionally not implemented and must remain optional; this is roadmap work, not a current defect.

## Confirmed strengths

- The app is local-first and does not require an account or community service.
- Runtime data fetches are local static paths.
- The configured static suite has broad schema, data, accessibility, and semantic coverage.
- All 66 books have cross-reference, outline, interlinear, word-map, and graph artifacts.
- Ten reader translations are packaged.
- Capability availability is explicit rather than inferred from button presence.
- Canonical target identity, migrations, quarantine concepts, and idempotent inquiry-job triggers exist.
- Reader/detail panel locking, follow mode, lazy interlinear loading, dark theme, and responsive control placement have explicit contracts.
- The exercised Psalms 14 route rendered without console warnings/errors.

## Prioritized task list

### Release gates

- [ ] Repair or replace the Edge/CDP browser runner.
- [ ] Make desktop and mobile browser suites green twice consecutively.
- [ ] Reconcile packaged data with `LICENSES.md` and `license-matrix.json`.
- [ ] Add footnotes and every runtime-loaded dataset to authoritative package/license inventory.
- [ ] Record explicit reviewed redistribution/commercial decisions.
- [ ] Regenerate package file/byte/gzip counts.
- [ ] Make `npm run verify` pass from a clean checkout.

### Test and recovery stabilization

- [ ] Triage all 11 uninvoked tests.
- [ ] Fix the 5 failing user-data recovery scenarios or update obsolete expectations with documented migrations.
- [ ] Update semantic tests for `source_token_span`.
- [ ] Update package, search, poll, performance, and user-data fixtures.
- [ ] Make smoke tests self-contained.
- [ ] Add all active tests to the default suite.
- [ ] Add CI.

### Data correctness and security

- [ ] Restore actual Hebrew Unicode token originals for all 39 Old Testament books.
- [ ] Add language-script validation for Hebrew and Greek interlinear tokens.
- [ ] Sanitize commentary HTML with an allowlist.
- [ ] Add CSP/Trusted Types planning and malicious-content tests.

### Performance and maintainability

- [ ] Define minimum-reader versus optional-study packages.
- [ ] Add compressed-size and route-level request budgets.
- [ ] Split CSS theme/component layers.
- [ ] Split persistence and browser-test modules.
- [ ] Add stable screenshot baselines.
- [ ] Rename `showProverbs` to the translation-workspace identifier.

### Product roadmap after health gates

- [ ] Add contiguous source-token-span selection and badges.
- [ ] Add unresolved/ambiguous English-anchor review.
- [ ] Enrich and expose inquiry-analysis results.
- [ ] Build scoped personal graph views.
- [ ] Design optional community stores only after personal workflows are stable.

## Recommended execution order

1. Release metadata and licensing inventory.
2. Browser-runner replacement/repair.
3. Orphan-test reconciliation and recovery fixes.
4. CI enforcement.
5. Hebrew interlinear source-token correction.
6. Commentary sanitization and CSP.
7. Package-size strategy.
8. Maintainability refactors.
9. Resume Phase 3+ product roadmap.

## Commands used

```powershell
npm run verify
npm run test:static
npm run audit
node app/scripts/*test.mjs  # executed individually for the orphan-test inventory
```

The release command failed at the desktop browser startup boundary. The configured static suite and publish-structure audit passed with the limitations documented above.
