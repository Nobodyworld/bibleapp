# Bible App Improvement Analysis

Reviewed: 2026-06-29

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
| P0 | Automated desktop/mobile browser suites fail at the Edge/CDP `Page.enable` startup boundary. | Stable launch and green interaction suites in a reproducible environment. |
| P0 | License/provenance records contain status language requiring dedicated review before public/commercial distribution. | One reviewed, internally consistent distribution decision per packaged dataset. |
| P1 | Several restored package-manifest entries report zero files/bytes despite populated directories. | Regenerated accurate inventory and an assertion preventing stale counts. |
| P1 | Tagging is verse-first even though the semantic model anticipates broader targets. | Versioned target-aware API, migrations, and tests before new tag UI. |

## Earlier recommendation status

| Area | State | Notes |
|---|---|---|
| Dark mode | Implemented | Explicit theme control, persistence, and contrast overrides exist. |
| Responsive reader/detail layout | Implemented | Includes mobile Study panel access. |
| Touch and keyboard equivalents | Partially implemented | Static accessibility checks exist; full mobile browser validation remains blocked. |
| Outline/Interlinear placement | Implemented | Side-panel-only, removing chapter-toolbar duplication. |
| Panel locking and follow mode | Implemented | Covered by executable transition tests and manual QA. |
| Interlinear layout and lazy loading | Implemented | Long-word constraints and verse-by-verse append are present. |
| Search and quick navigation | Implemented | Search and keyboard shortcuts exist. |
| Guided capability states | Implemented as a contract | Copy still matters for broken/disabled/empty packs. |
| Favorites/bookmarks | Planned | Favorites will be a system tag across target scopes. |
| Word/chunk tags | Planned | Requires target-aware assertions and selection anchors. |
| User inquiry analysis | Planned | Must be distinct from tagging a textual/rhetorical question. |
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

The next authorized implementation unit is Phase 1 in `TAG_FAVORITES_ANALYSIS_ROADMAP.md`. Do not begin graph or community UI before target-aware assertion migration, compatibility, and job-idempotency tests pass.
