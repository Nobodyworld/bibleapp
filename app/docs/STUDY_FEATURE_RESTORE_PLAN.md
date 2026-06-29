# Study Feature Restoration Record

Reviewed: 2026-06-29

Status: Substantially completed. This is a historical planning record, not the active task list.

## Restored product model

The reader remains the primary surface and the repository now packages:

- cross references and passage previews;
- commentary and footnotes;
- Strong's overlays and Hebrew/Greek lexicons;
- book outlines and search indexes;
- Hebrew/Greek interlinear data;
- translation workspace, word maps, and generated graph data;
- local tags, jobs, and user-data portability.

The active interaction contract is in `UI_FUNCTIONALITY_SCHEMA.md`.

## Current reader-adjacent flows

| Feature | Entry point | Current behavior |
|---|---|---|
| Cross references | Verse action or Refs tab | Opens references with contextual passage preview. |
| Commentary | Verse action or Cmt tab | Opens source entries for the current verse. |
| Footnotes | Inline verse marker | Opens the matching note in the detail panel. |
| Strong's / lexicon | Reader or interlinear token | Opens source-word details; origin words use the shared popup behavior. |
| Interlinear | Side-panel tool or Int tab | Chapter index or lazy-loaded verse inspection with bidirectional token follow-along. |
| Outline | Side-panel tool | Shows book sections and navigates to their references. |
| Search | Chapter Search tool or keyboard shortcut | Searches packaged verse and study indexes. |
| Tags | Chapter tool, verse action, or Tags tab | Manages local verse tags and custom tag definitions. |
| Translation workspace | Chapter Translate tool | Opens source-token and draft workflows for tokenized chapters. |

Outline and Interlinear are intentionally side-panel-only tools; they are not duplicated in the chapter tool group.

## Capability fallback rule

Packaged data can still be missing, disabled, invalid, or out of scope for a reference. Controls must resolve through the availability schema and expose a concise reason. Fallback copy is maintained in `MISSING_STUDY_DATA_COPY_TABLE.md`.

## Remaining work

1. Regenerate accurate package-manifest file/byte counts for restored study datasets.
2. Restore reliable automated desktop and mobile browser execution.
3. Implement the target-aware tag and favorites plan in `TAG_FAVORITES_ANALYSIS_ROADMAP.md`.
4. Revisit optional package profiles only if the project intentionally ships multiple compositions.
