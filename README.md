# Bible App

Local-first Bible study application with multi-translation reading,
commentary, interlinear analysis, semantic tagging, resilient persistence,
and desktop/mobile verification.

The application is a static browser client. Its Bible texts, commentary,
lexicons, cross-references, interlinear records, search indexes, and analysis
packs are shipped as local JSON data, so ordinary study sessions do not
require a remote service.

## Features

- Ten English Bible translations with chapter and verse navigation.
- Commentary, outlines, footnotes, cross-references, and Strong's lexicons.
- Hebrew and Greek interlinear views with morphology and language tooltips.
- Local search indexes, semantic tags, favorites, assertions, and study jobs.
- Browser-local persistence with import, export, and recovery coverage.
- Generated word maps and cross-reference graph analysis.
- Static, domain, accessibility, desktop-browser, and mobile-browser tests.

## Architecture

`app/index.html`, `app/app.js`, and `app/styles.css` provide the static shell.
Focused ES modules under `app/src/` implement routing, rendering, study
views, persistence, semantic data, and package state. Runtime datasets live
under `app/data/`; schemas and deterministic data tools live under
`app/schemas/` and `app/tools/`. Repository-level integration and integrity
tests are under `tests/`.

## Setup and Run

Prerequisites:

- Node.js 20 or newer
- Python 3 for the local static server
- Microsoft Edge for the browser verification suite

```powershell
npm ci
npm run serve
```

Open `http://127.0.0.1:8000/`. Routes are hash-based; for example:
`http://127.0.0.1:8000/#/read/bsb/psalms/23`.

## Verification

```powershell
npm run inventory:check
npm run test:static
npm run test:browser
npm run test:browser:mobile
npm run verify
```

`npm run verify` runs the full static, domain, accessibility, desktop,
mobile, inventory, and package audit suite.

## Privacy

The app is local-first. Bible data and study tools are served from this
repository, and user-created study state is stored in the browser. No account,
analytics service, or remote application API is required. Exported user data
should be handled like any other personal file.

## Licensing

Application code, tests, scripts, schemas, and tooling are available under
the MIT License. Bundled Bible and study data retains its source rights and
notices and is not described as MIT-licensed. See [NOTICE.md](NOTICE.md) and
[`app/data/source-manifest.json`](app/data/source-manifest.json).

## Known Limitations

- Browser-local data does not automatically synchronize between devices or
  browser profiles.
- The repository includes large runtime datasets and is heavier than a
  typical static web project.
- Browser verification currently expects Microsoft Edge on Windows.
- Some generated source text contains legacy character-encoding artifacts.
- The app has no hosted backend, collaborative accounts, or cloud backup.
