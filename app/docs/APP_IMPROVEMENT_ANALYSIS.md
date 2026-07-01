# Bible App Improvement Analysis

Reviewed: 2026-06-30

Status: Historical recommendation matrix. Use `FULL_APP_HEALTH_AUDIT.md` for current release health and `TAG_FAVORITES_ANALYSIS_ROADMAP.md` for current feature state.

## Purpose

This document consolidates the earlier broad UI review into an implementation-status matrix. Detailed current contracts live in `CURRENT_WORK.md` and `UI_FUNCTIONALITY_SCHEMA.md`; tag work is tracked in `TAG_FAVORITES_ANALYSIS_ROADMAP.md`.

## Current assessment

The app has a substantial local-first reader and study baseline. It is suitable for continued feature development, but it is not release-ready while browser regression execution and package/license metadata remain unresolved.

### Strengths

- Ten local text editions with hash-based book/chapter navigation.
- Packaged search, outlines, cross references, commentary, footnotes, Strong's, lexicons, and Hebrew/Greek interlinear data.
- Local-first tags, custom definitions, translation workspace, jobs, and export/import.
- Explicit capability resolution and immutable reference-context hierarchy.
- Light/dark themes, responsive layouts, keyboard shortcuts, reduced-motion and forced-color accommodations.
- Static integrity, capability, analysis, interlinear, accessibility, UI-contract, reference-context, and documentation tests.

### Release blockers

| Priority | Problem | Required outcome |
|---|---|---|
| P0 | License/provenance records contain status language requiring dedicated review before public/commercial distribution. | One reviewed, internally consistent distribution decision per packaged dataset. |
| P1 | Hebrew Interlinear `original` fields contain transliteration instead of Hebrew script. | Defined alignment and regenerated source-script tokens with validation. |
| P1 | Minimum-reader versus optional-study packaging and route budgets are undefined. | Explicit distribution and performance budgets. |

## Earlier recommendation status

| Area | State | Notes |
|---|---|---|
| Dark mode | Implemented | Explicit theme control, persistence, and contrast overrides exist. |
| Responsive reader/detail layout | Implemented | Includes mobile Study panel access. |
| Touch and keyboard equivalents | Partially implemented | Static and mobile emulation coverage exists; real-pointer focus restoration remains to be exercised. |
| Outline/Interlinear placement | Implemented | Side-panel-only, removing chapter-toolbar duplication. |
| Panel locking and follow mode | Implemented | Covered by executable transition tests and manual QA. |
| Interlinear layout and lazy loading | Implemented | Long-word constraints and verse-by-verse append are present. |
| Search and quick navigation | Implemented | Search and keyboard shortcuts exist. |
| Guided capability states | Implemented as a contract | Copy still matters for broken/disabled/empty packs. |
| Favorites/bookmarks | Implemented | System favorite tag spans book, chapter, verse, English span, and source-token scopes. |
| Word/chunk tags | Partially implemented | English spans and individual source tokens work; contiguous source-token spans remain. |
| User inquiry analysis | Foundation implemented | Inquiry is separate from textual question and queues an idempotent local analysis job; richer results remain. |
| Personal graph UI | Planned | Existing assertion projection is a foundation, not a finished view. |
| Community graph/contributions | Future | Must remain opt-in and separated from personal stores. |
| Screenshot regression | Deferred | Add after tag/favorites visual structure stabilizes. |

## Architecture priorities

### 1. Protect target identity

Persisted data must have an explicit scope and complete identity. Book, chapter, verse, English text span, source token, and source-token span are different targets. Strong's code is useful metadata but cannot replace a verse-local token identity.

### 2. Keep personal and community state separate

Personal features must work offline without an account. Community caches, outbox records, polls, and aggregates must not mutate personal assertions automatically.

### 3. Make triggered work idempotent

Applying a behavior-bearing tag can enqueue a job, but repeated saves/imports must not create duplicate active jobs. Trigger identity should include assertion, job type, and relevant input revision.

### 4. Treat projections as rebuildable

Verse-tag indexes and personal graph projections should be derived from canonical assertions. They can be rebuilt after migration or import and should not become a competing source of truth.

### 5. Preserve capability boundaries

UI availability uses capability health plus scoped-data presence. A healthy capability with no data for one verse is not the same as a missing or invalid pack.

## Accessibility and visual acceptance baseline

New controls must:

- have explicit accessible names and button types;
- expose toggle state with `aria-pressed` where applicable;
- work by keyboard and touch, not hover alone;
- retain visible focus and readable light/dark contrast;
- respect reduced motion;
- avoid horizontal overflow at mobile width;
- restore focus when a temporary panel/menu closes.

## Performance direction

- Continue verse-level lazy rendering for interlinear inspection.
- Load graph neighborhoods by selected scope instead of rendering the full graph.
- Keep deterministic inquiry analysis local and chunk large scans.
- Derive indexes incrementally, but retain a full rebuild path for recovery.

## Next work

Phases 1 and 2 in `TAG_FAVORITES_ANALYSIS_ROADMAP.md` are complete. Resolve the release-health gates in `FULL_APP_HEALTH_AUDIT.md`, then continue the remaining Phase 3 source-token-span and anchor-review work. Do not begin community UI before personal graph workflows and release verification are stable.
