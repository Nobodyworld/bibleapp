# Showcase Screenshots

The 17 tracked PNG files under `docs/images/` are retained historical
public-preview captures. They predate the accepted compact reader context,
exact-token Meaning, and consolidated My Data interface, so they are not
current release-candidate evidence.

`tools/capture-public-screenshots.mjs` is the executable screenshot authority
and writes `docs/images/SCREENSHOTS.md` as a generated filename inventory. That
generated inventory is not maintained narrative documentation. The capture
workflow still targets retired controls and titles; issue #33 owns its repair,
all image generation or replacement, generated-inventory refresh, and visual
approval.

Do not run `npm run screenshots:public` as part of Phase 4. Keep the existing
README image links until reviewed replacement files exist.

## Deferred File Disposition

Every action in this table is deferred to issue #33.

| Current file | Phase 4 classification | Issue #33 recommendation |
|---|---|---|
| `docs/images/reader.png` | Historical capture; defer | Keep filename and recapture. |
| `docs/images/reader-dark.png` | Historical capture; defer | Keep filename and recapture. |
| `docs/images/book-picker.png` | Historical capture; defer | Keep filename and recapture. |
| `docs/images/detail-panel.png` | Historical capture; defer | Keep filename and recapture an accepted compact detail state. |
| `docs/images/detail-panel-dark.png` | Historical capture; defer | Keep filename and recapture an accepted compact detail state. |
| `docs/images/verse-context-tabs.png` | Historical capture; defer | Replace with `docs/images/verse-context-controls.png`; remove the obsolete filename only after all references change. |
| `docs/images/interlinear.png` | Historical capture; defer | Keep the internal technical filename; recapture and describe publicly as Language Study. |
| `docs/images/interlinear-dark.png` | Historical capture; defer | Keep the internal technical filename; recapture and describe publicly as Language Study. |
| `docs/images/hebrew-side-panel.png` | Historical capture; defer | Keep filename and recapture exact Hebrew Word/Strong's context. |
| `docs/images/hebrew-side-panel-dark.png` | Historical capture; defer | Keep filename and recapture exact Hebrew Word/Strong's context. |
| `docs/images/search.png` | Historical capture; defer | Keep filename and recapture. |
| `docs/images/study-marks.png` | Historical capture; defer | Keep filename and recapture unified target-aware Study Marks. |
| `docs/images/study-marks-dark.png` | Historical capture; defer | Keep filename and recapture unified target-aware Study Marks. |
| `docs/images/study-data.png` | Historical retired-surface capture; defer | Replace with `docs/images/my-data.png`; remove the old file only after generator, narrative, and generated-inventory references change. |
| `docs/images/local-processing.png` | Historical retired-surface capture; defer | Delete after generator, narrative, and generated-inventory references change; add `docs/images/my-data-maintenance.png` for the accepted Local maintenance surface. |
| `docs/images/mobile.png` | Historical capture; defer | Keep filename and recapture. |
| `docs/images/mobile-dark.png` | Historical capture; defer | Keep filename and recapture. |

Issue #33 should also consider new `docs/images/meaning.png` and
`docs/images/my-data-backup-restore.png` captures. Add them only when they are
generated and visually approved; README must never point to a future filename.
