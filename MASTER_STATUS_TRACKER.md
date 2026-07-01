# Bible App Master Status Tracker

Reviewed: 2026-07-01

Status: Active repository-wide plan and task source of truth.

## Purpose

This master status tracker (MST) consolidates past, present, and future plans from the repository. Detailed design documents remain useful evidence and decision records, but new status changes must be reflected here.

Runtime behavior is established by code and executable tests. A task marked Complete means its implementation or documentation outcome exists; it does not override a separate Blocked validation or release task.

## Status legend

| Status | Meaning |
|---|---|
| Complete | The stated outcome exists and has appropriate current evidence. |
| Partial | A usable foundation exists, but part of the stated outcome remains. |
| Blocked | Work cannot be accepted yet because a named dependency, environment, or review is unresolved. |
| Planned | Approved current backlog work. |
| Future | Intentionally deferred until prerequisite phases are stable. |
| Ongoing | A recurring contract, audit, or maintenance responsibility. |
| Superseded | Retained for traceability but not part of the current implementation direction. |

## Current verdict

The application is healthy for continued local development but is not release-ready.

The core reader, study panels, semantic target model, Favorites UI, local inquiry foundation, package inventory, recovery/domain coverage, security boundary, CI, and desktop/mobile release suites are functional. The remaining release gates are external package/license review, missing Hebrew-script token originals, and an explicit minimum-package/performance strategy.

## Portfolio snapshot

| Status | Tasks |
|---|---:|
| Complete | 76 |
| Partial | 6 |
| Blocked | 4 |
| Planned | 39 |
| Future | 11 |
| Ongoing | 7 |
| Superseded | 1 |
| **Total** | **144** |

## Source-plan registry

| Source | Plan role | Completeness |
|---|---|---|
| `app/docs/FULL_APP_HEALTH_AUDIT.md` | Active release-health findings and remediation backlog. | Partial |
| `app/docs/CURRENT_WORK.md` | Active implementation and verification snapshot. | Ongoing |
| `app/docs/TAG_FAVORITES_ANALYSIS_ROADMAP.md` | Active tags, inquiry, graph, and community feature roadmap. | Partial |
| `app/docs/UI_FUNCTIONALITY_SCHEMA.md` | Active UI behavior and state contract. | Ongoing |
| `app/docs/VISUAL_REVIEW_SUMMARY.md` | Active rendered QA record and visual backlog. | Partial |
| `app/docs/APP_IMPROVEMENT_ANALYSIS.md` | Historical broad recommendation matrix. | Partial |
| `app/docs/STUDY_FEATURE_RESTORE_PLAN.md` | Historical study-data restoration plan. | Partial |
| `app/docs/STUDY_FEATURE_UI_AUDIT.md` | Historical study UI findings and regression contracts. | Partial |
| `app/docs/STUDY_DATA_LICENSE_CANDIDATES.md` | Active legal/provenance research backlog. | Planned |
| `app/docs/MISSING_STUDY_DATA_COPY_TABLE.md` | Ongoing missing-capability copy contract. | Ongoing |
| `app/docs/TEST_MODE_SPLIT_RECOMMENDATION.md` | Superseded package-profile proposal. | Superseded |

## Master task ledger

### 1. Release verification and delivery

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| REL-001 | Maintain one static verification entry point. | Complete | `npm run test:static` covers integrity, data, contracts, accessibility, docs, and master-plan checks. | Health audit |
| REL-002 | Repair or replace the Edge/CDP browser runner. | Complete | Replaced the raw CDP client with `playwright-core` using installed Edge. | Health audit; visual review |
| REL-003 | Make desktop browser regression pass twice consecutively. | Complete | Desktop passed 31 checks twice; hostile commentary coverage later raised the suite to 32. | Health audit |
| REL-004 | Make mobile browser regression pass twice consecutively. | Complete | Mobile passed 32 checks twice before hostile commentary coverage was added. | Health audit; visual review |
| REL-005 | Make `npm run verify` pass from a clean checkout. | Complete | Full static, domain, inventory, desktop, mobile, and structural audit command passes. | Health audit |
| REL-006 | Add continuous integration for maintained verification. | Complete | Windows GitHub Actions workflow runs `npm ci` and `npm run verify`. | Health audit |
| REL-007 | Keep publish audit explicitly structural, not legal/runtime approval. | Complete | Current audit reports both limitations. | Test-mode decision |
| REL-008 | Introduce multiple package test profiles. | Superseded | Do not split while only one full-study composition ships. Revisit only if multiple distributions are intentional. | Test-mode decision |
| REL-009 | Define fixtures and browser workflows if package profiles return. | Future | Required only if REL-008 is reactivated. | Test-mode decision |

### 2. Package inventory, licensing, and distribution

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| PKG-001 | Reconcile packaged data with `LICENSES.md` and `license-matrix.json`. | Blocked | Requires authoritative dataset inventory plus legal/data review. | Health audit |
| PKG-002 | List every runtime-loaded dataset in one authoritative package/license inventory. | Complete | Inventory now includes footnotes, presentation, language metadata, semantic seeds, and all reader study paths. | Health audit |
| PKG-003 | Record reviewed public redistribution decisions for every dataset. | Blocked | Requires legal/data reviewer. | Health audit; license candidates |
| PKG-004 | Record reviewed commercial-use and sale-with-app decisions. | Blocked | Requires legal/data reviewer. | Health audit; license candidates |
| PKG-005 | Record exact attribution, modification, territory, version, and reviewer fields. | Planned | Use the candidate evaluation template. | License candidates |
| PKG-006 | Regenerate actual package file counts and byte counts. | Complete | Deterministic inventory records 25 packs and 2,672 unique package files. | Health audit; restoration record |
| PKG-007 | Add gzip/compressed-size metadata. | Complete | Every pack and package records raw and per-file gzip totals. | Health audit |
| PKG-008 | Separate or filter Hebrew and Greek interlinear inventory paths. | Complete | Inventory filters the shared directory into 39 Hebrew and 27 Greek book shards. | Health audit |
| PKG-009 | Add a package-manifest drift test. | Complete | `npm run inventory:check` is part of `test:static`. | Health audit |
| PKG-010 | Define minimum-reader versus optional-study distribution. | Planned | Include CDN, caching, versioning, and offline behavior. | Health audit |
| PKG-011 | Add package and route-level size/request budgets. | Planned | Measure cold-start bytes and requests before setting limits. | Health audit |
| PKG-012 | Review Strong's and lexicon source chain. | Planned | Highest provenance-review priority. | License candidates |
| PKG-013 | Review interlinear and morphology source chain. | Planned | Confirm token-alignment and commercial redistribution rights. | License candidates |
| PKG-014 | Review commentary sources individually. | Planned | Determine full-text/excerpt and attribution rights. | License candidates |
| PKG-015 | Review cross-reference compilation provenance. | Planned | Confirm redistribution of the reference graph. | License candidates |
| PKG-016 | Review footnote and translation-note provenance. | Planned | Include marker/offset derivative-data questions. | License candidates |
| PKG-017 | Review outline/editorial heading provenance. | Planned | Confirm modified hierarchy redistribution rights. | License candidates |
| PKG-018 | Review search, word-map, and graph derivatives after inputs are cleared. | Planned | Derived-data decision depends on upstream sources. | License candidates |

### 3. Test and recovery stabilization

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| TST-001 | Enforce one release query key for runtime modules. | Complete | `tests/module-singletons.mjs` is in `test:static`. | Health audit |
| TST-002 | Enforce singleton URLs for stateful `dom.js` and `stores.js`. | Complete | Recursive import test prevents split module state. | Health audit |
| TST-003 | Test that reader navigation clears stale detail content. | Complete | Source regression plus rendered desktop verification. | Health audit |
| TST-004 | Triage all executable tests excluded from `test:static`. | Complete | `tests/TEST_INVENTORY.md` classifies eight promoted files and four retired/replaced scripts. | Health audit |
| TST-005 | Resolve five failing user-data recovery scenarios. | Complete | All 10 recovery scenarios pass, including migration, fallback, quarantine, and legacy exports. | Health audit |
| TST-006 | Update semantic tests for `source_token_span`. | Complete | Semantic test accepts all current target types. | Health audit |
| TST-007 | Update package-planner fixtures. | Complete | Tests now use current `reader-texts` and feature-pack contracts. | Health audit |
| TST-008 | Update search and performance fixtures. | Complete | Obsolete scripts were retired; runtime Search remains covered and new performance budgets stay separately planned. | Health audit |
| TST-009 | Update poll schema fixtures. | Complete | Poll-response schema is committed and lifecycle tests pass. | Health audit |
| TST-010 | Update user-data semantic store-version fixtures. | Complete | Current store v4 and canonical graph IDs are covered. | Health audit |
| TST-011 | Make smoke tests self-contained. | Complete | Obsolete smoke script was replaced by the self-starting interaction suite. | Health audit |
| TST-012 | Add every maintained non-browser test to the default suite. | Complete | Seven domain suites run through `npm run test:domain` inside `test:static`. | Health audit |
| TST-013 | Add stable screenshot-diff baselines. | Planned | Defer until tag/favorites visual structure is stable and browser runner works. | Health audit; visual review |
| TST-014 | Maintain source checks for accessibility contracts. | Ongoing | Static test covers names, keyboard/touch hooks, focus styles, themes, motion, and contrast. | UI contract |
| TST-015 | Add rendered focus-restoration and 200% zoom checks. | Planned | Static checks are insufficient for acceptance. | Health audit; visual review |
| TST-016 | Keep master-plan registry and task statuses machine-checked. | Complete | `tests/master-status-tracker.mjs` validates this file and its source registry. | Master consolidation |

### 4. Reader, study tools, and interaction contracts

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| UI-001 | Package core reader and ten translations. | Complete | Manifest/capability checks pass. | Current work |
| UI-002 | Package Search, Strong's, lexicons, references, commentary, footnotes, outlines, and interlinear data. | Complete | Current packaged capability checks pass; licensing remains separate. | Restoration record |
| UI-003 | Keep Outline and Interlinear exclusively in side-panel navigation. | Complete | Desktop and mobile Study launcher contract exists. | UI audit |
| UI-004 | Constrain Interlinear long words without overlap. | Complete | John 4 `Pharisaioi` rendered without card overflow in 2026-07-01 QA. | UI audit |
| UI-005 | Preserve correct English alignment for reported John 4 tokens. | Complete | Both `hoti` tokens verified, including “because.” | UI audit |
| UI-006 | Synchronize reader and Interlinear tokens by verse and token index. | Complete | Unique Strong's is fallback only; rendered follow-along passed. | UI contract |
| UI-007 | Lock detail panel after explicit actions. | Complete | State contract and rendered QA pass. | UI audit |
| UI-008 | Reset to follow mode on background, clear, disengage, or navigation. | Complete | State transitions and rendered QA pass. | UI audit |
| UI-009 | Preserve detail Back/Forward and re-arm restored listeners. | Complete | Duplicate module-state defect fixed and rendered history verified. | Health audit |
| UI-010 | Clear stale panel content when translation/book/chapter changes. | Complete | `resetDetailForNavigation()` preserves reader history. | Health audit |
| UI-011 | Lazy-load Interlinear inspection one verse at a time. | Complete | Psalms 14:1 appended verse 2 near the panel bottom. | UI audit |
| UI-012 | Gate Hebrew-only gematria and letter analysis by language/script. | Complete | Greek John 4 view did not display Hebrew analysis. | UI audit |
| UI-013 | Keep dark-theme outline/verse highlights readable. | Complete | Dedicated theme rules and manual QA exist. | UI audit |
| UI-014 | Distinguish unavailable capability from no scoped data. | Complete | `enabled`, `capability_unavailable`, and `data_unavailable` contract is executable. | UI schema |
| UI-015 | Maintain concise fallback copy for missing/invalid/empty study data. | Ongoing | `MISSING_STUDY_DATA_COPY_TABLE.md` remains the copy contract. | Fallback matrix |
| UI-016 | Keep cross-reference button labels plain and preview verse numbers superscripted. | Complete | Static regression and desktop inspection. | Health audit |
| UI-017 | Keep origin-word links focused on original forms with shared popup behavior. | Complete | Recorded as restored current flow. | Restoration record |
| UI-018 | Rename internal `showProverbs` translation-workspace identifier. | Planned | Runtime label is correct; maintenance debt remains. | UI audit |
| UI-019 | Split broad CSS into reader, detail, study, tags, and theme layers. | Planned | Current stylesheet complexity remains high. | Health audit |
| UI-020 | Split persistence and browser-test modules by responsibility. | Planned | Preserve one smoke journey while reducing concentrated complexity. | Health audit |

### 5. Semantic targets, tags, and Favorites

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| TAG-001 | Define `tag:favorite` and user `tag:inquiry` separately from textual `tag:question`. | Complete | Packaged definitions and picker labels exist. | Tag roadmap phase 1 |
| TAG-002 | Add behavior metadata to tag definitions. | Complete | `display_behavior` and optional job trigger exist. | Tag roadmap phase 1 |
| TAG-003 | Support seven canonical target types. | Complete | Book, chapter, verse, range, text span, source token, and source-token span constructors exist. | Tag roadmap phase 1 |
| TAG-004 | Generate deterministic target and assertion IDs. | Complete | Covered by tag tests. | Tag roadmap phase 1 |
| TAG-005 | Use `setTagAssertion` as canonical API with `setVerseTag` compatibility. | Complete | Current store API and tests. | Tag roadmap phase 1 |
| TAG-006 | Migrate legacy verse assertions and system IDs. | Complete | Versioned migration exists. | Tag roadmap phase 1 |
| TAG-007 | Quarantine invalid imported target records. | Complete | Recovery and user-data semantic suites verify one quarantine record without double counting. | Tag roadmap; health audit |
| TAG-008 | Keep target indexes and verse compatibility projection rebuildable. | Complete | Current store model and tests. | Tag roadmap phase 1 |
| TAG-009 | Deduplicate behavior-trigger jobs by assertion/job/revision. | Complete | Tag tests cover duplicate prevention. | Tag roadmap phase 1 |
| TAG-010 | Add current-book Favorite action. | Complete | Persistent accessible toggle exists. | Tag roadmap phase 2 |
| TAG-011 | Add current-chapter Favorite action. | Complete | Persistent accessible toggle exists. | Tag roadmap phase 2 |
| TAG-012 | Add verse-row Favorite action. | Complete | Hover/focus presentation preserves direct toggle access. | Tag roadmap phase 2 |
| TAG-013 | Add verse-context Favorite action. | Complete | Current context tabs support it. | Tag roadmap phase 2 |
| TAG-014 | Add English text-selection Favorite and tag actions. | Complete | Uses exact rendered character boundaries. | Tag roadmap phases 2–3 |
| TAG-015 | Add source-token Favorite and tag actions. | Complete | Interlinear cards use exact token identity. | Tag roadmap phases 2–3 |
| TAG-016 | Group Favorites by target type in one panel. | Complete | Current Favorites panel covers all supported types. | Tag roadmap phase 2 |
| TAG-017 | Preserve Favorites through export/import. | Complete | Data-layer tests pass. | Tag roadmap phase 2 |
| TAG-018 | Commit rendered Favorite interaction assertions. | Complete | Assertions exist in `interaction-test.mjs`. | Tag roadmap phase 2 |
| TAG-019 | Obtain green rendered Favorite desktop/mobile runs. | Complete | Favorite flows pass in both maintained rendered suites. | Tag roadmap phase 2 |
| TAG-020 | Build one target-aware tag picker. | Complete | Picker filters definitions by allowed target type. | Tag roadmap phase 3 |
| TAG-021 | Show editable badges on English spans and source tokens. | Complete | Current reader and Interlinear UI. | Tag roadmap phase 3 |
| TAG-022 | Resolve exact or uniquely relocated English span anchors safely. | Complete | Ambiguous/unresolved anchors do not attach to arbitrary text. | Tag roadmap phase 3 |
| TAG-023 | Add anchor-review UI for ambiguous or unresolved English spans. | Planned | Required to repair drifted targets explicitly. | Tag roadmap |
| TAG-024 | Add contiguous source-token-span selection. | Planned | Must enforce ordered adjacent token identity. | Tag roadmap phase 3 |
| TAG-025 | Add Favorite/tag actions and badges for source-token spans. | Planned | Depends on TAG-024. | Tag roadmap phase 3 |
| TAG-026 | Add Greek/Hebrew source-token-span interaction tests. | Planned | Individual source tokens are covered; chunks are not. | Tag roadmap phase 3 |

### 6. Inquiry-analysis jobs

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| INQ-001 | Define and register `inquiry-analysis`. | Complete | Job type, trigger, and processor foundation exist. | Tag roadmap phase 4 |
| INQ-002 | Queue inquiry work for every supported target type. | Complete | Canonical behavior trigger operates on tag assertions. | Tag roadmap phase 4 |
| INQ-003 | Produce deterministic target/source summaries and graph patches. | Partial | Foundation output and missing-input warnings exist. | Tag roadmap phase 4 |
| INQ-004 | Add same-source uses across scripture. | Planned | Requires efficient corpus lookup. | Tag roadmap phase 4 |
| INQ-005 | Add same-English/different-source comparisons. | Planned | Requires normalized English/source mapping. | Tag roadmap phase 4 |
| INQ-006 | Add comparison candidates from references, morphology, and workspace data. | Planned | Combine packaged local sources without requiring AI. | Tag roadmap phase 4 |
| INQ-007 | Render a dedicated Inquiry result view. | Planned | Jobs can store results; dedicated analysis UI remains. | Tag roadmap phase 4 |
| INQ-008 | Invalidate stale results after related tag/draft/token changes. | Planned | Define relevant input revision rules. | Tag roadmap phase 4 |
| INQ-009 | Test queueing, deduplication, execution, cancellation, staleness, and missing-data output. | Partial | Queue/dedup/foundation tests exist; complete lifecycle coverage remains. | Tag roadmap phase 4 |
| INQ-010 | Keep external AI optional. | Ongoing | Deterministic local job envelope remains the required baseline. | Tag roadmap |

### 7. Personal graph

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| GRF-001 | Project active personal assertions into graph nodes and edges. | Complete | `projectAssertionsToSemanticGraph` exists. | Tag roadmap |
| GRF-002 | Combine assertion projection, packaged graph neighborhoods, and job patches. | Partial | Inputs exist; unified scoped builder remains. | Tag roadmap phase 5 |
| GRF-003 | Add scoped graph entry points for verse, word, Favorites, and inquiries. | Planned | Avoid an unbounded all-data canvas. | Tag roadmap phase 5 |
| GRF-004 | Render grouped lists, small networks, paths, and conflict cards. | Planned | Choose visualization by relationship, not novelty. | Tag roadmap phase 5 |
| GRF-005 | Add personal-only, packaged-only, and combined filters. | Planned | Preserve provenance of every edge. | Tag roadmap phase 5 |
| GRF-006 | Build Favorites map. | Planned | Use current target index as source. | Tag roadmap |
| GRF-007 | Build inquiry queue graph. | Planned | Depends on richer inquiry results. | Tag roadmap |
| GRF-008 | Build source-word study graph. | Planned | Show Strong's, source uses, renderings, and notes. | Tag roadmap |
| GRF-009 | Build personal conflict/hot-spot view. | Planned | Personal uncertainty precedes community aggregates. | Tag roadmap |
| GRF-010 | Build tag clustering/network view. | Planned | Scope by book/chapter/target type. | Tag roadmap |
| GRF-011 | Test nodes/edges generated by Favorites and inquiry tags. | Planned | Add before accepting graph UI. | Tag roadmap phase 5 |

### 8. Optional community layer

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| COM-001 | Keep personal features fully offline and account-free. | Ongoing | Community work must not become a dependency. | Tag roadmap |
| COM-002 | Define community schemas separately from personal assertions. | Future | Start only after personal graph workflows and release verification stabilize. | Tag roadmap phase 6 |
| COM-003 | Add explicit community feature flag and opt-in UI. | Future | Default remains private/local. | Tag roadmap phase 6 |
| COM-004 | Cache community assertions and aggregates without overwriting personal data. | Future | Separate namespace/store required. | Tag roadmap phase 6 |
| COM-005 | Add explicit contribution outbox. | Future | No automatic sharing. | Tag roadmap phase 6 |
| COM-006 | Allow adoption of community items as attributed personal copies. | Future | Copy rather than mutate local assertions. | Tag roadmap |
| COM-007 | Add community tags without replacing system/user tags. | Future | Use separate IDs and provenance. | Tag roadmap |
| COM-008 | Add aggregate interpretation polls and disagreement hot spots. | Future | Present context, not authority. | Tag roadmap |
| COM-009 | Prove disabling community leaves all personal functions intact. | Future | Required acceptance test for community release. | Tag roadmap phase 6 |

### 9. Data correctness and application security

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| DAT-001 | Restore Hebrew Unicode in Old Testament token `original` fields. | Planned | Current sampled records duplicate transliteration. | Health audit |
| DAT-002 | Preserve transliteration separately from source script. | Planned | Required during interlinear regeneration. | Health audit |
| DAT-003 | Define source-text-to-interlinear token alignment. | Planned | Must precede safe Hebrew token regeneration. | Health audit |
| DAT-004 | Validate Hebrew and Greek script against declared language. | Planned | Add per-book assertions. | Health audit |
| SEC-001 | Sanitize packaged commentary HTML with a strict allowlist. | Complete | Commentary rendering now strips active content, attributes, and unsafe URLs. | Health audit |
| SEC-002 | Add malicious commentary fixtures. | Complete | Desktop/mobile interaction suite covers script, handlers, JavaScript URLs, SVG, classes, and safe links. | Health audit |
| SEC-003 | Add a Content Security Policy. | Complete | Static app shell limits scripts/styles/connections to self and blocks objects/forms/base changes. | Health audit |
| SEC-004 | Evaluate Trusted Types after sanitization/CSP design. | Planned | Defense-in-depth, not a sanitizer replacement. | Health audit |

### 10. Accessibility, responsive UI, and visual QA

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| A11Y-001 | Provide explicit accessible names and button types. | Complete | Static accessibility audit passes. | Improvement analysis |
| A11Y-002 | Expose toggle state through `aria-pressed`. | Complete | Favorite/tag/context controls covered. | Improvement analysis |
| A11Y-003 | Support keyboard activation and visible focus. | Complete | Source contracts pass; rendered coverage remains under TST-015. | Improvement analysis |
| A11Y-004 | Provide touch alternatives to hover-only behavior. | Partial | Touch emulation and mobile Study access pass; a real-pointer focus-restoration sweep remains. | Improvement analysis |
| A11Y-005 | Respect reduced motion and forced colors. | Complete | Static CSS audit passes. | Improvement analysis |
| A11Y-006 | Prevent mobile horizontal overflow. | Complete | Mobile release suite asserts document width at a 390×844 touch viewport. | Visual review |
| A11Y-007 | Restore focus after temporary menus/panels close. | Partial | Contract exists; rendered verification remains. | Visual review |
| VIS-001 | Exercise mobile panel open/close, scroll, focus, and token selection. | Blocked | Requires working in-app or automated mobile browser path. | Visual review |
| VIS-002 | Add visual coverage for Favorites. | Planned | Couple with screenshot baseline work. | Visual review |
| VIS-003 | Add visual coverage for Inquiry results. | Future | Depends on INQ-007. | Visual review |
| VIS-004 | Add visual coverage for personal graph views. | Future | Depends on graph UI. | Visual review |

### 11. Documentation and maintainability

| ID | Task or outcome | Status | Evidence or next action | Source |
|---|---|---|---|---|
| DOC-001 | Establish one repository-wide plan/status source of truth. | Complete | This root MST consolidates all current plan sources. | Master consolidation |
| DOC-002 | Preserve detailed design documents as evidence and decision records. | Ongoing | Detailed contracts remain under `app/docs`. | Documentation index |
| DOC-003 | Update the MST whenever task status changes. | Ongoing | Enforced structurally by test and review policy. | Master consolidation |
| DOC-004 | Resolve factual license/package drift in documentation. | Partial | Package presence/count drift is corrected; final source-rights decisions remain external. | Health audit |
| DOC-005 | Keep historical recommendations labeled historical or superseded. | Complete | Plan registry distinguishes active and historical sources. | Documentation index |
| DOC-006 | Keep source code free of undocumented TODO/FIXME backlog. | Ongoing | 2026-07-01 scan found no source TODO/FIXME markers outside documentation/data. | Master consolidation |

## Dependency order

1. Repair the browser runner and reconcile active non-browser tests.
2. Generate authoritative package inventory and complete license/provenance review.
3. Correct Hebrew token source data and secure commentary rendering.
4. Complete source-token-span selection and English anchor review.
5. Enrich inquiry analysis and expose its results.
6. Build scoped personal graph views.
7. Add optional community contracts only after personal workflows and release verification are stable.

## Completion rules

1. Change a task to Complete only when the exact stated outcome exists.
2. Keep implementation and validation tasks separate when one can complete without the other.
3. A passing structural package audit does not complete licensing or runtime readiness.
4. A committed browser assertion does not complete a rendered browser-validation task.
5. Future community work cannot weaken private, offline personal behavior.
6. Superseded plans remain documented but are not implementation backlog.

## Verification

```powershell
npm run test:static
npm run audit
```

`npm run verify` is green and remains the technical release command. Legal approval is a separate external gate.
