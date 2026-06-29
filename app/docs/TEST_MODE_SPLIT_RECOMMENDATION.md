# Test Mode Split Decision Record

Reviewed: 2026-06-29

Status: Superseded proposal retained for traceability.

## Original proposal

The earlier package contained reader data while optional study datasets could be absent. This document proposed separate `publish` and `full-study` validation modes so expected missing packs would not appear as regressions.

## Current decision

Do not implement the split now. The current package manifest declares the full study feature set and the repository contains cross-reference, commentary, footnote, outline, search, interlinear, Strong's, lexicon, word-map, and graph datasets. The active scripts therefore validate one packaged full-study profile:

```text
npm run test:static
npm run test:browser
npm run test:browser:mobile
npm run audit
```

`npm test` combines the static and browser suites. `npm run verify` adds the structural publish audit.

## Current test boundary

| Layer | Responsibility |
|---|---|
| Static integrity | Syntax, JSON, paths, dataset contracts, capabilities, analysis, accessibility source contracts, documentation. |
| Desktop browser | Rendered navigation, study panels, panel locking/history, token follow-along, persistence, console health. |
| Mobile browser | Responsive layout, touch emulation, study-panel reachability, and the shared interaction flow. |
| Publish audit | Structural package checks only; it does not establish runtime or legal readiness. |

The desktop and mobile browser scripts are currently blocked in this environment by Edge/CDP failing at `Page.enable` before navigation. This is not a reason to weaken or skip their assertions.

## When to revisit profiles

Introduce explicit profiles only if the repository intentionally ships more than one package composition, such as:

- `reader-core`: text and local annotation only.
- `full-study`: all current datasets and tools.
- a separately licensed distribution with a materially different capability set.

If profiles return, each must have:

1. A manifest fixture declaring required and optional packs.
2. Explicit capability expectations.
3. Shared reader/startup tests.
4. Profile-specific browser workflows.
5. Failure output that names the active profile.
