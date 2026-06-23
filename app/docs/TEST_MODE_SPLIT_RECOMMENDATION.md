# Test Mode Split Recommendation

## Goal

Adopt two explicit validation modes without reducing product ambition:

- Publish package mode: validates current license-scoped packaged app.
- Full study mode: validates future restored study-data builds.

## Why Split

Current script set mixes assumptions from both modes. This causes expected failures in publish package mode and obscures true regressions.

## Mode A: Publish Package Tests

Purpose:

- Verify active packaged app behavior and retained datasets.

Should include:

- Runtime shell loading and route handling.
- Reader rendering from retained verse data.
- User-data stores, tags, jobs, import/export.
- Semantic seed integrity for packaged semantic files.
- Package metadata validity for current package profile.
- Clear/intentional behavior when optional study packs are absent.

Expected profile assumptions:

- `data/verses/*` retained translations present.
- `data/license-matrix.json` and retained docs present.
- Study datasets may be absent by design.

## Mode B: Full Study Tests

Purpose:

- Validate full dataset build once licensed/provenance-approved packs are restored.

Should include:

- Commentary, crossrefs, footnotes, outlines, interlinear, strongs, lexicon.
- Search and analysis indexes.
- Full package composition and capability availability checks.
- End-to-end study workflows and performance baselines.

Expected profile assumptions:

- Full package manifest and study artifacts are present.
- Derived data provenance and version metadata are complete.

## Initial Classification (No Script Changes Yet)

Likely Publish Package mode:

- `semantic-test.mjs`
- `poll-response-test.mjs`
- `recovery-scenarios-test.mjs`
- `user-data-semantic-test.mjs`
- `interaction-test.mjs` (if configured for absent-pack messaging)

Likely Full Study mode:

- `smoke-test.mjs`
- `contract-test.mjs`
- `search-test.mjs`
- `performance-test.mjs`
- `job-processor-test.mjs`
- `benchmark-search-json.mjs`
- `benchmark-search-sqlite.mjs`
- `build-search-indexes.mjs`
- `build-word-map-indexes.mjs`
- `build-graph-indexes.mjs`

Mixed/needs profile-awareness:

- `package-state-test.mjs`
- `package-planner-test.mjs`
- `doc-consistency-test.mjs`

## Implementation Recommendation

1. Add explicit test-mode selector (`publish` or `full-study`) in a top-level script runner.
2. Keep script files but route each into mode-specific suites.
3. Introduce profile fixtures for expected package-manifest variants.
4. Ensure every failure message states the expected mode.
5. Keep one shared minimal smoke for startup + reader integrity across both modes.

## Exit Criteria

- Publish package CI is green without requiring non-packaged study artifacts.
- Full study CI is green when full licensed dataset profile is present.
- No script silently assumes the wrong data profile.
