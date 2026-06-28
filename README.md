# Bible App

This repository contains the private publish package for a static Bible reader app.

The active app is in `app/`. The `backup/` directory is local reference/archive material and is ignored from publishing.

## Current Package

- Reader UI and local browser storage tools.
- Retained Bible text editions under `app/data/verses/`.
- Machine-readable data licensing in `app/data/license-matrix.json`.
- Human-readable licensing notes in `app/LICENSES.md`.
- Retained cross-reference, commentary, outline, interlinear, lexicon, search, word-map, and graph datasets.
- Current engineering and UI contracts in `app/docs/`.

The package retains licensing and provenance notes as records. Runtime availability does not imply legal approval for public redistribution or commercial sale.

## Run

```powershell
npm run serve
```

Open:

```text
http://127.0.0.1:8000/
```

## Audit

From the repository root:

```powershell
npm run verify
```

This runs syntax/data validation, accessibility and documentation checks, desktop and mobile browser regression suites, and the structural publish audit.
