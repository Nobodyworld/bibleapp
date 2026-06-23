# Bible App

This repository contains the private publish package for a static Bible reader app.

The active app is in `app/`. The `backup/` directory is local reference/archive material and is ignored from publishing.

## Current Package

- Reader UI and local browser storage tools.
- Retained Bible text editions under `app/data/verses/`.
- Machine-readable data licensing in `app/data/license-matrix.json`.
- Human-readable licensing notes in `app/LICENSES.md`.
- Study restoration planning docs in `app/docs/`.

The current package is license-scoped. Study features remain part of the product direction, but study datasets are restored only after source-specific licensing and redistribution terms are recorded.

## Run

```powershell
cd app
python -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/
```

## Audit

From the repository root:

```powershell
node .\app\tools\publish-audit.mjs
```
