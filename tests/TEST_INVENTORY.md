# Test Inventory and Disposition

Reviewed: 2026-07-01

## Purpose

This records the disposition of executable test scripts that existed locally under `app/scripts` but were excluded from Git and the maintained test commands. Active coverage is now committed and runs through `npm run test:domain`; obsolete scripts remain ignored as local historical material.

## Promoted maintained tests

| Script | Status | Maintained coverage |
|---|---|---|
| `job-processor-test.mjs` | Active | Declared processors, job execution, persistence, and stale-result handling. |
| `package-planner-test.mjs` | Active and updated | Current `reader-texts` package, feature dependencies, install/removal plans, and summaries. |
| `package-state-test.mjs` | Active and updated | Current bundled/managed package modes, capability toggles, operations, and export/import. |
| `poll-response-test.mjs` | Active and updated | Poll identity, updates, aggregates, tombstones, export/import, and the committed poll-response schema. |
| `recovery-scenarios-test.mjs` | Active and repaired | IndexedDB fallback/migration, quota visibility, malformed imports, backups, quarantine, legacy export migration, and JSON recovery. |
| `semantic-test.mjs` | Active and updated | Semantic definitions, relations, propositions, and all current target types. |
| `user-data-semantic-test.mjs` | Active and updated | Schema-v2 targets/assertions, migrations, graph projection, revisions, quarantine, and import/export. |
| `schema-validation.mjs` | Active helper | Lightweight schema assertions used by maintained domain tests. |

## Retired or replaced local scripts

| Script | Disposition | Replacement or reason |
|---|---|---|
| `contract-test.mjs` | Retired | Assumes removed text-edition/package metadata. Current integrity, capability, analysis, semantic, documentation, and publish audits cover its maintained contracts. |
| `search-test.mjs` | Retired | Targets an obsolete generated search manifest and modular search packs. Runtime search is covered by static data integrity and desktop/mobile interaction tests. |
| `performance-test.mjs` | Retired | Targets obsolete lexicon shard paths and unenforced thresholds. New route/package budgets remain a separately tracked deliverable. |
| `smoke-test.mjs` | Replaced | Assumes an externally running server. `interaction-test.mjs` starts its own server and contains the broader smoke journey. |

## Non-test utilities

Build, benchmark, performance-report, publish-cleaning, synchronization, and mouse-helper scripts remain ignored. They are not release tests and must not be added to `test:static` without an explicit maintained contract.

## Commands

```powershell
npm run test:domain
npm run test:static
npm run test:browser
npm run test:browser:mobile
npm run verify
```
