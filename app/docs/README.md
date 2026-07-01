# App Documentation Index

Reviewed: 2026-07-01

## Active documents

- `../../MASTER_STATUS_TRACKER.md`: repository-wide source of truth for past, current, and future plan/task completeness.
- `FULL_APP_HEALTH_AUDIT.md`: current full-app health verdict, evidence, prioritized findings, acceptance criteria, and task list.
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
2. `../../MASTER_STATUS_TRACKER.md` is the repository-wide plan and task-status source of truth.
3. `FULL_APP_HEALTH_AUDIT.md` is the detailed release-health and remediation evidence source.
4. `CURRENT_WORK.md` is the implementation snapshot and must not claim a browser suite passes unless it was run successfully in the current environment.
5. Feature state changes must be reflected in both the MST and the detailed tag roadmap matrix when implementation lands.
6. Packaged-data inventory is intended to come from `../data/package-manifest.json`; until audit item P1-1 is resolved, verify it against the filesystem.
7. Licensing/provenance records come from `../LICENSES.md` and `../data/license-matrix.json`, but audit item P0-2 must be resolved before relying on them for distribution.
8. A provenance record does not itself establish redistribution or commercial clearance.
