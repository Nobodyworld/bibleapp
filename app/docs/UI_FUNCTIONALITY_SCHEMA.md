# UI Functionality Contract

Reviewed: 2026-07-01

## Control placement

- The chapter tool group contains Search, Tags, Translate, Jobs, and Data.
- Outline and Interlinear are side-panel tools only.
- Mobile exposes a Study panel launcher so side-panel-only tools remain reachable.
- Verse context tabs expose Parallel, Refs, Cmt, Int, and Tags when their scoped actions apply.
- Book, chapter, verse-row, verse-context, and Interlinear source-token favorite stars are direct `tag:favorite` toggles and expose state through `aria-pressed`.
- Interlinear source-token tag actions open the target-aware tag editor. The editor only presents active tags whose `allowed_target_types` include `source_token`.
- Selecting reader text exposes Favorite, Tags, Study, Draft, and Red letters actions. Favorite and Tags use one canonical `text_span` target.

The executable control map is `src/ui-contracts.js`.

## Control availability

Every study control resolves to exactly one state:

| State | Enabled | Meaning |
|---|---:|---|
| `enabled` | yes | Required capability and scoped data are available. |
| `capability_unavailable` | no | A required package or capability is disabled, missing, or invalid. |
| `data_unavailable` | no | The capability exists, but the current book, chapter, or verse has no applicable data. |

The side-panel Interlinear control and Translation workspace require the interlinear capability plus at least one tokenized verse in the current chapter. The verse `Int` tab requires tokens for that exact verse. Disabled controls use native `disabled`, `aria-disabled`, a reason in `title`, and unavailable styling.

## Panel interaction modes

| Mode | Behavior |
|---|---|
| `follow` | Reader Strong's hover may show transient word details. |
| `locked` | The selected panel remains open while reader and interlinear tokens can still highlight each other. |

Transitions:

- Activating a chapter tool, side-panel tool, verse action, context tab, Strong's token, or detail action enters `locked`.
- Hover alone never enters `locked`.
- Clicking a disengage/background target, clearing the panel, or resetting it returns to `follow`.
- Changing translation, book, or chapter returns to `follow`, clears the Strong's pin and stale detail content, and preserves reader-location Back/Forward history.
- Panel Back/Forward restores the saved panel and mode. Restoring an Interlinear verse view must re-arm its lazy loader.

## Runtime module identity

All versioned static JavaScript imports use one release query key. Stateful modules, especially `dom.js` and `stores.js`, must resolve to one URL throughout the runtime graph. Different query strings create independent browser module instances and would split panel history, lock state, or persistence authority.

## Interlinear rendering and synchronization

Reader and panel tokens match by `verse + token_index`. Strong's code is used only when it identifies exactly one token.

- Reader token hover/focus highlights and scrolls the matching interlinear card into view.
- Interlinear card hover/focus highlights the matching reader token.
- Leaving either token clears both temporary highlights.
- Synchronization does not unlock or replace a locked panel.
- A verse inspection renders one verse initially and appends the next verse as the user nears the bottom of `#detailContent`.
- Cards must constrain both original-language and English/gloss columns so long words wrap without overlapping.
- Hebrew-only analysis such as gematria and Hebrew mark details must not render for Greek tokens.
- Each card's favorite and tag actions use the exact canonical `source_token` target built from its verse reference and token metadata; they do not infer identity from display text.
- Active non-favorite source-token tags render as editable card badges without replacing the favorite star.

## Reader text-span selection

- Every rendered verse-text segment carries its canonical start/end character offsets.
- A selection derives its range from the DOM Range endpoints, not by searching for the selected string. Repeated words therefore retain the selected occurrence's identity.
- Leading/trailing whitespace is excluded from the canonical target and snapshot.
- Selecting text takes precedence over activating a Strong's token.
- Tagged spans render a visible highlight and editable tag badges.
- Snapshot drift resolves only when the original offsets still match or the snapshot has one unique relocated occurrence. Ambiguous or unresolved snapshots are not rendered on arbitrary text.

## Canonical reference context

Navigation and selection use one immutable hierarchy:

`translation → testament → book → chapter → verse → word`

`src/reference-context.js` normalizes this context and creates stable keys at translation, testament, book, chapter, verse, or word scope. A word key ends at its verse-local token index; Strong's code, language, and original spelling are metadata, not identity.

Committed selection and transient hover remain separate:

- `activeReferenceContext` changes only through navigation or explicit selection.
- `hoverReferenceContext` exists only during follow-along highlighting.
- Leaving a hovered word clears only `hoverReferenceContext`.
- Persisted records require a complete key for their declared scope. Key generation rejects missing or unknown hierarchy data.

The navigation reference hierarchy supports one word token. Text spans and source-token spans use the separate schema-v2 semantic target model and are not forced into the navigation word key.

Tag persistence uses schema-v2 semantic targets for book, chapter, verse, verse range, text span, source token, and source-token span. `verse_tags` remains a rebuildable verse-only compatibility projection; `tag_target_index` indexes every supported target type.

## Persistence startup boundary

IndexedDB initialization and migration have a three-second boundary. If the browser blocks or stalls the request, startup continues with the localStorage backend instead of leaving the reader on its loading shell.

## Executable validation

- `tests/ui-contracts.mjs`: availability, panel transitions, control schema, token identity.
- `tests/reference-context.mjs`: hierarchy normalization and stable keys.
- `tests/interlinear.mjs`: packaged interlinear data contracts.
- `tests/module-singletons.mjs`: one release key and singleton URLs for stateful runtime modules.
- `tests/reader-ui-regressions.mjs`: source-level reader layout and navigation-reset regressions.
- `app/scripts/interaction-test.mjs`: rendered interaction behavior, including reader text-span selection, favorite controls, editable target badges, source-token tagging, Favorites grouping, panel history, and cleanup, when the browser runner is available.
