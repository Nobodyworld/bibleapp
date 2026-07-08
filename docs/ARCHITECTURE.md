# Architecture

Bible App Reader is a static browser application. The shell is served from
`app/index.html`, `app/app.js`, and `app/styles.css`; runtime behavior is split
across ES modules in `app/src/`.

## Runtime Shape

- Routing uses hash routes so the app can run from a plain static server.
- Reader state is loaded from local JSON datasets under `app/data/`.
- Study views are rendered in the side panel for search, commentary, outlines,
  interlinear records, Strong's data, tags, jobs, and user-data tools.
- User-created state is stored in browser storage and can be exported/imported
  as JSON.

## Data Loading

The app uses deterministic JSON shards for Bible text, search, commentary,
cross-references, lexicons, interlinear records, semantic seeds, and generated
analysis. Package and source manifests describe what is bundled and where it
came from.

## Tests

Repository tests cover static integrity, data-domain behavior, UI contracts,
reader regressions, accessibility source checks, desktop browser flows, mobile
browser flows, package inventory, and publish audit checks.
