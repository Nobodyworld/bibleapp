# UI Functionality Contract

Reviewed: 2026-07-12

## Control placement

- The chapter tool group contains Search, Study Marks, Translate, Processing, and Study Data.
- Contextual side-panel navigation follows one visible scope order: `Word → Verse → Chapter → Book`.
- Word and Verse controls render in `#detailContext` when a verse detail is active. Chapter and Book controls remain persistently mounted immediately after that contextual surface so containing-scope tools stay reachable while Word and Verse views change.
- The derived order and tool ownership remain centralized in `src/panel-context-model.js`; persistent Chapter and Book mounts do not create independent scope state.
- Word is present only when canonical word/source-token context exists for the active verse, and it is always the first scope when present.
- Verse owns Parallel, References, Commentary, verse Language Study, Tags, and the verse Favorite control.
- Chapter owns the chapter-level Language Study entry. Book owns Outline.
- A compact context summary identifies the selected word and containing verse without repeating explanatory prose inside each detail view.
- Visible contextual labels use the full product terms Parallel, References, Commentary, Language, and Tags. Stable short DOM labels (`Par`, `Refs`, `Cmt`, `Int`) remain only for existing browser automation compatibility; full labels are rendered and exposed through `title` and `aria-label`.
- `Language Study` is the user-facing name. Existing `Interlinear` identifiers, capability names, data contracts, and test names remain intentionally internal.
- Mobile exposes a Study panel launcher so side-panel-only tools remain reachable.
- There is exactly one Book mark control and one Chapter mark control. Each trigger displays `☆` or `★` from its Favorite state, reports that state through `aria-pressed`, and opens one target-aware menu containing Favorite and the other tags applicable to that target.
- Book and Chapter mark triggers expose menu state through `aria-haspopup="menu"` and `aria-expanded`. Active non-favorite tags remain visible outside the closed menu as persistent editable badges.
- Book and Chapter mark controls rerender after tag changes and after navigation so their stars, badges, targets, and menu contents remain current.
- Verse-row, verse-context, and Language Study source-token favorite stars remain direct `tag:favorite` toggles and expose state through `aria-pressed`.
- Interlinear source-token tag actions open the target-aware tag editor. The editor only presents active tags whose `allowed_target_types` include `source_token`.
- Selecting reader text exposes Favorite, Tags, Study, Draft, and Red letters actions. Favorite and Tags use one canonical `text_span` target.

The executable control map is `src/ui-contracts.js`. The scoped navigation order and tool matrix are `src/panel-context-model.js`.

## Scoped panel context

The panel distinguishes direct data ownership from inherited containing context:

| Scope | Direct tools/data | Availability |
|---|---|---|
| Word | Strong's/lexical detail, source word, morphology, word-level actions | Only when canonical word context exists |
| Verse | Parallel text, references, commentary, verse Language Study, verse tags/favorite | When a verse is active |
| Chapter | Chapter Language Study entry | When a chapter is active |
| Book | Outline | When a book is active |
| Global/user | Settings, personal data, maintenance, diagnostics | Reserved for the later Settings/My Data redesign |

A word can inherit navigation to its containing Verse, Chapter, and Book tools, but those tools remain visibly attached to their true scope. Word detail must never imply that cross-references or commentary belong to the lexical entry itself.

`src/active-word-context.js` is the explicit authority for the selected word available to contextual navigation. It stores only a token plus navigation options, suppresses forced duplicate history entries, rejects a stored word when its verse does not match the active verse, and clears through existing navigation/reset paths. View code must not read or write an ad hoc `studyContext.strong` property.

## Responsive panel placement

- Desktop keeps the side panel sticky beside the reader and requires the detail heading to remain visible.
- From `769px` through `960px`, the shell becomes one column and the app header becomes three rows. The detail panel therefore uses a larger sticky offset and reduced viewport height so its heading and context summary begin below the header.
- At `768px` and below, the detail panel becomes the existing full-screen mobile surface.
- Context controls wrap; the scoped navigation must not create horizontal document or panel overflow.

## Control availability

Every study control resolves to exactly one state:

| State | Enabled | Meaning |
|---|---:|---|
| `enabled` | yes | Required capability and scoped data are available. |
| `capability_unavailable` | no | A required package or capability is disabled, missing, or invalid. |
| `data_unavailable` | no | The capability exists, but the current book, chapter, or verse has no applicable data. |

The chapter Language Study control and Translation workspace require the internal interlinear capability plus at least one tokenized verse in the current chapter. The verse `Int` automation label represents the visibly rendered Language control and requires tokens for that exact verse. Disabled controls use native `disabled`, `aria-disabled`, a reason in `title`, and unavailable styling. The current scoped view uses `aria-current="page"` and remains visually distinct.

## Panel interaction modes

| Mode | Behavior |
|---|---|
| `follow` | Reader Strong's hover may show transient word details. |
| `locked` | The selected panel remains open while reader and interlinear tokens can still highlight each other. |

Transitions:

- Activating a chapter tool, side-panel tool, verse action, context control, Strong's token, or detail action enters `locked`.
- Hover alone never enters `locked`.
- Clicking a disengage/background target, clearing the panel, or resetting it returns to `follow`.
- Changing translation, book, or chapter returns to `follow`, clears the Strong's pin and stale detail content, and preserves reader-location Back/Forward history.
- Panel Back/Forward restores the saved panel and mode. Restoring an Interlinear verse view must re-arm its lazy loader.
- Scope navigation reuses the existing detail-history and lock authority in `src/dom.js`; it must not create another history stack or independent lock state.

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
- Original-language analysis separates base-letter records from attached mark metadata. Each visible Greek letter glyph reconstructs its base letter plus every attached mark and safely normalizes the display cluster.
- Greek breathing marks, accents, diaeresis, iota subscript, and multiple attached marks remain on the visible glyph. Letter names and base transliterations continue to come from the base alphabet record.
- The separate `Greek marks / symbols` list remains explanatory detail. The shared Hebrew analysis and gematria behavior remain intact.
- Each card's favorite and tag actions use the exact canonical `source_token` target built from its verse reference and token metadata; they do not infer identity from display text.
- Active non-favorite source-token tags render as editable card badges without replacing the favorite star.

## Strong's reference controls

- Word origin, Language Study related entries, and valid concordance `see GREEK` / `see HEBREW` references share the Strong's reference-control contract.
- Destinations resolve from exact structured metadata. Unresolved references remain plain text.
- Pointer, keyboard, focus, and touch access hydrate app-controlled previews without changing panel history. Activating a resolved reference opens the destination Strong's entry, and panel Back restores the originating panel.
- App-controlled language and Strong's previews are clamped or flipped within the intersection of the visible detail panel and viewport.

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

- `tests/ui-contracts.mjs`: availability, panel transitions, control schema, corrected data scopes, and token identity.
- `tests/panel-context-model.mjs`: Word-first scope order, tool ownership, active-word API, shell ordering, full visible labels, responsive wrapping, and narrow sticky-offset contracts.
- `tests/reference-context.mjs`: hierarchy normalization and stable keys.
- `tests/interlinear.mjs`: packaged interlinear data contracts, Greek marked-glyph reconstruction, and shared Hebrew gematria behavior.
- `tests/module-singletons.mjs`: one release key and singleton URLs for stateful runtime modules.
- `tests/strong-reference-control.mjs`: exact concordance reference resolution and unresolved plain-text fallback.
- `tests/reader-ui-regressions.mjs`: source-level reader layout, panel-aware tooltip, concordance control, and navigation-reset regressions.
- `tests/original-language-study.mjs`: visible Language Study naming and source-backed study/reference behavior.
- `app/scripts/panel-context-interaction-test.mjs`: desktop, narrow, and mobile Word-first ordering, inherited Verse navigation, Verse-only clearing, horizontal-overflow checks, sticky-header placement, visible headings, and browser-error coverage.
- `app/scripts/original-language-study-interaction-test.mjs`: rendered source/transliteration rows, lazy study enhancement, related-reference preview/navigation/history, and tooltip-containment behavior when the browser runner is available.
- `app/scripts/interaction-test.mjs`: rendered interaction behavior, including reader text-span selection, favorite controls, editable target badges, source-token tagging, Favorites grouping, panel history, and cleanup, when the browser runner is available.
