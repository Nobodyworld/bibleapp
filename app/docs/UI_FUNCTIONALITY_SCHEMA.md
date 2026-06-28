# UI Functionality Contract

Reviewed: 2026-06-28

## Control availability

Every study control resolves to exactly one state:

| State | Enabled | Meaning |
|---|---:|---|
| `enabled` | yes | Required capability and scoped data are available. |
| `capability_unavailable` | no | A required package or capability is disabled, missing, or invalid. |
| `data_unavailable` | no | The capability exists, but the current book, chapter, or verse has no applicable data. |

The toolbar Interlinear and Translation controls require interlinear capability plus at least one tokenized verse in the current chapter. The verse `Int` tab requires interlinear capability plus tokens for that exact verse. Disabled controls use the native `disabled` state, `aria-disabled`, explanatory title text, and grey unavailable styling.

## Panel interaction modes

The detail panel has two modes:

| Mode | Behavior |
|---|---|
| `follow` | Reader Strong's hover may replace the panel with transient word details. |
| `locked` | The selected panel remains open while reader and interlinear tokens can still highlight each other. |

Transitions:

- Activating a toolbar study control, verse study button, context tab, Strong's token, or detail action enters `locked`.
- Hover alone never changes the mode.
- Clicking a noninteractive background area, clearing the panel, or resetting it returns to `follow`.
- Changing translation, book, or chapter returns to `follow` and clears the Strong's pin.

## Interlinear synchronization

Reader and panel tokens match by `verse + token_index`. Strong's code is used only as a fallback when it identifies exactly one token.

- Reader token hover highlights and scrolls the matching interlinear card.
- Interlinear card hover highlights and scrolls the matching reader token.
- Leaving either token clears both temporary highlights.
- Synchronization does not unlock or replace a locked panel.

The executable contract is defined in `src/ui-contracts.js` and validated by `tests/ui-contracts.mjs`.
