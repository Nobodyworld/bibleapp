# Study Capability Fallback Copy Matrix

Reviewed: 2026-06-29

## Scope

The current repository packages the full study-data set. This matrix applies only when a capability is missing, disabled, invalid, or has no data for the active scope. It is a copy contract, not evidence that a pack is currently absent.

| Feature | Capability-unavailable primary copy | Scoped-data-unavailable primary copy | Suggested secondary copy |
|---|---|---|---|
| Cross references | Cross-reference data is unavailable. | No cross references were found for this verse. | Check that the Cross References study pack is installed and enabled. |
| Commentary | Commentary data is unavailable. | No commentary entries were found for this verse. | Check that the Commentary study pack is installed and enabled. |
| Interlinear | Interlinear data is unavailable. | No interlinear tokens were found for this verse or chapter. | Check that the Interlinear study pack is installed and enabled. |
| Strong's / lexicon | Word-study data is unavailable. | No word-study entry was found for this token. | Check that the Strong's and Lexicon study packs are installed and enabled. |
| Outline | Outline data is unavailable. | No outline sections were found for this book. | Check that the Outlines study pack is installed and enabled. |
| Search | Search indexes are unavailable. | No results matched this query and scope. | Check that the Search study pack is installed and enabled. |
| Translation workspace | Source-language tools are unavailable for this chapter. | No tokenized verses were found in this chapter. | Draft-only mode may be offered separately; token alignment requires Interlinear data. |

## Rendering rules

1. Use `capability_unavailable` for a disabled, missing, dependency-failed, or invalid capability.
2. Use `data_unavailable` when the capability is healthy but has no data for the current book/chapter/verse.
3. Put the user-facing condition first.
4. Put package IDs, dependency failures, fetch paths, and validation detail behind optional diagnostic disclosure.
5. Disabled controls must expose the same reason through `title` and `aria-disabled`; where practical, a panel shell may show the fuller message.
6. Do not say “private build” unless the product actually exposes multiple named distribution profiles.
