# App Documentation Index

Reviewed: 2026-06-29

## Active documents

- `CURRENT_WORK.md`: verified implementation state, known blockers, and the next work boundary.
- `UI_FUNCTIONALITY_SCHEMA.md`: control availability, panel locking, reference context, and interlinear synchronization contract.
- `TAG_FAVORITES_ANALYSIS_ROADMAP.md`: approved design and phased task list for target-aware tags, favorites, inquiry jobs, personal graph, and optional community features.
- `VISUAL_REVIEW_SUMMARY.md`: current visual and browser-QA baseline.

## Reference and decision records

- `APP_IMPROVEMENT_ANALYSIS.md`: consolidated status matrix for earlier UI and architecture recommendations.
- `STUDY_FEATURE_RESTORE_PLAN.md`: restoration record; most packaged study-data restoration is complete.
- `STUDY_FEATURE_UI_AUDIT.md`: resolved and remaining study-tool UI findings.
- `MISSING_STUDY_DATA_COPY_TABLE.md`: fallback copy contract for a missing, disabled, or invalid optional pack.
- `STUDY_DATA_LICENSE_CANDIDATES.md`: research backlog only; it is not a license clearance.
- `TEST_MODE_SPLIT_RECOMMENDATION.md`: superseded test-strategy proposal retained as a decision record.

## Source-of-truth rules

1. Runtime behavior is defined by code and executable tests, not planning prose.
2. `CURRENT_WORK.md` is the status source of truth and must not claim a browser suite passes unless it was run successfully in the current environment.
3. Feature state changes must be reflected in the tag roadmap matrix when implementation lands.
4. Packaged-data inventory comes from `../data/package-manifest.json`; licensing/provenance records come from `../LICENSES.md` and `../data/license-matrix.json`.
5. A provenance record does not itself establish redistribution or commercial clearance.
