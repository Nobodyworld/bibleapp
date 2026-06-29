# Tags, Favorites, Questions, and Graph Roadmap

Reviewed: 2026-06-29

## Purpose

This document is the working feature list for expanding tags from verse labels into a user-driven analysis system. It is intended to survive across multiple sessions and should be updated as features move from planned to implemented.

The guiding rules are:

> A tag is a semantic assertion about a target. Some tags are rendered as quick buttons, and some tags trigger local analysis jobs, but they should still use the same assertion model.

> A tag describing the biblical text is not the same assertion as a tag describing the user's workflow. In particular, “this text is a question” and “I have a question about this target” must remain separate concepts.

## Current implementation inventory

### Already implemented

| Area | Current state |
|---|---|
| Default tags | `positive_sentiment`, `negative_sentiment`, `command_declaration`, and textual `question`. |
| Custom tags | User can create, edit, and retire custom tags. |
| Verse tagging UI | Verse-level tag picker, tag editor, tag badges, and tag index exist. |
| Semantic tag assertions | Tag applications normalize into assertion records with `actor`, `visibility`, `confidence`, `review_status`, and `active`. |
| Local storage | Tags, workspace data, assertions, polls, packages, and backups use IndexedDB with localStorage fallback. |
| Job queue | Local tag and workspace job events exist with queued, planned, running, completed, failed, cancelled, and simulation-only states. |
| Current job processors | `tag-index-refresh`, `translation-edit-analysis`, `personal-glossary-build`, and `word-map-refresh`. |
| Reference context | Stable hierarchy exists: `translation -> testament -> book -> chapter -> verse -> word`. |
| Graph projection | Local assertions can project into nodes and edges through `projectAssertionsToSemanticGraph`. |
| Polls | Poll response store and aggregate logic exist for future interpretation/community flows. |
| Export/import | User data export/import includes tags, workspace, assertions, polls, and packages. |

### Important current gaps

| Gap | Why it matters |
|---|---|
| Tag UI is verse-first | Tag definitions allow `text_span` and `source_token`, but the visible UI only supports verse tagging. |
| `setVerseTag` is scope-specific | A target-aware `setTagAssertion` API is needed for book, chapter, verse, text span, source token, and source-token chunk. |
| Assertion IDs are verse-key based | Word and chunk targets need deterministic target IDs that include translation/testament/book/chapter/verse/token or span identity. |
| `deriveVerseTagsFromAssertions` ignores non-verse targets | Verse badges can remain derived, but broader target indexes must be separate projections. |
| No user-inquiry tag or inquiry-analysis trigger exists | The user intent behind `?` should produce structured local data without changing textual `tag:question` semantics. |
| Personal graph is not exposed as a user-facing view | The graph projection exists but needs a UI and graph-specific result types. |
| Community graph is not modeled separately yet | Community participation must be optional and must not be required for personal features. |
| Textual question and user inquiry are not separated | Existing `tag:question` means the text contains a direct, rhetorical, or implied question; repurposing it as user uncertainty would corrupt semantics. |
| Runtime tags still use legacy IDs | Canonical semantic IDs use `tag:*`; legacy IDs must remain compatibility aliases during migration, not become a second identity system. |

## Target model

### Target types

The system should support tags on these targets:

| Target type | Example use | Identity rule |
|---|---|---|
| `book` | Favorite John, tag Genesis as creation study. | `translation:testament:book` plus target metadata. |
| `chapter` | Favorite John 4. | `translation:testament:book:chapter`. |
| `verse` | Tag John 4:10 with `?` or `favorite`. | `translation:testament:book:chapter:verse`. |
| `verse_range` | Tag John 4:7-15 as a unit. | Start and end references. |
| `text_span` | Tag an English phrase or word chunk. | Verse key plus character anchor and text snapshot. |
| `source_token` | Tag Greek or Hebrew token. | Word key plus token index, Strong's, language, original. |
| `source_token_span` | Tag a multi-token Greek/Hebrew phrase. | Verse key plus ordered token range and source snapshots. |

Use the existing reference context hierarchy for canonical keys. Strong's code, language, and original text should remain metadata, not primary identity, because token index is the verse-local identity.

### Target schema invariants

- Every persisted target declares `target_type`, `translation_id`/edition, testament, book, and all hierarchy fields required for its scope.
- Verse ranges are ordered, stay within one book/chapter in the first implementation, and store both bounds.
- Text spans store character bounds plus a text snapshot and drift status.
- Source-token spans store an ordered, contiguous token range plus source snapshots.
- Deterministic target IDs include target type and canonical scoped identity.
- Import rejects or quarantines incomplete/unknown targets instead of inventing placeholders.

### Favorites as tags

Use one canonical system tag:

```text
tag:favorite
```

Do not create separate conceptual tags for `favorite_book`, `favorite_chapter`, `favorite_verse`, and `favorite_word` unless a future requirement proves they need different semantics. The target type tells the app which favorite scope it is.

Recommended tag definition additions:

| Field | Value |
|---|---|
| `id` | `tag:favorite` |
| `legacy_id` | `favorite` |
| `label` | `Favorite` |
| `category` | `user_collection` |
| `default_icon` | `★` |
| `allowed_target_types` | `book`, `chapter`, `verse`, `verse_range`, `text_span`, `source_token`, `source_token_span` |
| `display_behavior` | `quick_toggle` |

UI behavior:

- Book selector or book outline can show a favorite star for the current book.
- Chapter header can show a favorite star for the current chapter.
- Verse row can show a favorite star near existing verse tools.
- Reader text selection and interlinear/source tokens can show favorite in the selection/tag menu.
- The Favorites panel should be a filtered tag index grouped by target type.

### Button-like tags

Some tags should behave like simple toggle buttons because their meaning is immediate and common.

| Behavior | Example tags | Rule |
|---|---|---|
| `quick_toggle` | Favorite | Toggle immediately; no extra form. |
| `toggle_with_optional_note` | Positive, Negative, Command/Declaration | Toggle quickly, but allow notes later. |
| `queue_analysis` | Inquiry (`?`) | Toggle and enqueue a targeted analysis job. |
| `custom_manual` | User custom tags | Open normal picker/editor. |

The behavior belongs on the tag definition, not in one-off UI code. This keeps favorites, inquiries, and future utility tags consistent.

## Textual question versus user inquiry

Keep the existing semantic tag:

```text
tag:question
```

Meaning: the biblical target contains or expresses a direct, rhetorical, or implied question. It remains a discourse-function tag and does not enqueue analysis.

To prevent two indistinguishable `?` controls, present this existing tag as `Text question` (or equivalent explicit wording) in the picker. Reserve the compact `?` quick action for `tag:inquiry`. This is a display change, not a semantic-ID migration.

Add a separate system tag:

```text
tag:inquiry
```

Recommended definition:

| Field | Value |
|---|---|
| `legacy_id` | `inquiry` |
| `label` | `?` |
| `description` | The user has a question or unresolved study concern about this target. |
| `category` | `user_workflow` |
| `allowed_target_types` | All supported target types. |
| `display_behavior` | `queue_analysis` |
| `on_apply_job_type` | `inquiry-analysis` |

The visible `?` action can be intuitive without changing the meaning of the existing textual-question tag.

## Inquiry tag workflow

The `?` inquiry tag represents “the user has a question about this target” and should enqueue useful local analysis.

### New job type

Proposed job type:

```text
inquiry-analysis
```

Trigger:

- Applying `tag:inquiry` to a book, chapter, verse, text span, source token, or source-token span.
- Editing a note attached to an inquiry tag.
- Changing a related translation draft or token rendering.

Inputs:

| Field | Meaning |
|---|---|
| `target` | The exact tagged target. |
| `assertion_id` | The tag assertion that triggered the job. |
| `question_text` | Optional user note or generated prompt. |
| `reference_context` | Complete normalized context. |
| `selected_text` | English text snapshot for text-span targets. |
| `source_tokens` | Source-token metadata for word targets. |
| `strong_codes` | Strong's codes involved in the target. |
| `translation_id` | Current translation, initially `bsb`. |

Outputs:

| Output section | Contents |
|---|---|
| `inquiry_profile` | Interpreted inquiry type: translation, comparison, definition, usage, grammar, variant, interpretation, or unknown. |
| `source_language_summary` | Hebrew/Greek token, Strong's, morphology, gloss, lexicon summary. |
| `english_rendering_summary` | Current English span and related renderings in the same verse/chapter/book. |
| `same_source_uses` | Other occurrences of the same Strong's/source token across scripture. |
| `same_english_different_source` | Places where the same English word maps to different Hebrew/Greek words. |
| `comparison_candidates` | Nearby verses, cross references, same lemma, same morphology, and translation workspace links. |
| `confidence` | Confidence score and missing-data warnings. |
| `graph_patch` | Nodes and edges the personal graph can display without mutating canonical packaged data. |

Initial processor can be deterministic and local-only. It does not need external AI to be useful:

1. Resolve the target.
2. Pull packaged word-map, interlinear, Strong's, verse text, cross-reference, and graph data.
3. Generate structured findings and graph patches.
4. Mark missing inputs clearly.
5. Store result on the local job event.

Future optional AI can consume this same job input/output envelope without replacing the deterministic processor.

## Personal graph

The personal graph should combine:

1. User assertions: tags, favorites, inquiries, interpretations, poll responses.
2. User workspace data: drafts, token renderings, red-letter ranges, manual alignments.
3. Packaged graph data: cross references, word-map edges, Strong's/lexicon relations.
4. Job results: inquiry-analysis, glossary candidates, word-map refresh findings.

### Graph nodes

| Node type | Source |
|---|---|
| `book` | Reference target. |
| `chapter` | Reference target. |
| `verse` | Current semantic graph and packaged analysis graph. |
| `text_span` | User text selection. |
| `source_token` | Interlinear/source word identity. |
| `source_token_span` | Multi-word original-language selection. |
| `tag_definition` | System or user tag. |
| `tag_assertion` | User applies/removes a tag. |
| `job_result` | Analysis result generated from user action. |
| `inquiry` | User inquiry assertion or inquiry-analysis profile. |
| `strongs_entry` | Strong's code. |
| `lexicon_definition` | Local lexicon entry summary. |
| `interpretation_proposition` | Proposition used by interpretation/poll flows. |

### Graph edges

| Edge type | Meaning |
|---|---|
| `contains` | Book -> chapter -> verse -> span/token. |
| `tagged_as` | Target -> tag definition. |
| `favorited` | Target -> `tag:favorite`; can be derived from `tagged_as`. |
| `asks_about` | Inquiry assertion -> target. |
| `produced` | Job -> job result. |
| `mentions_strong` | Target or job result -> Strong's entry. |
| `translates_to` | Source token -> English span. |
| `same_source_as` | Source-token occurrences with same Strong's/lemma. |
| `same_english_as` | Text spans with same normalized English rendering. |
| `supports_interpretation` | Target -> interpretation proposition. |
| `conflicts_with` | Proposition/result -> competing proposition/result. |

### Personal graph views

| View | Purpose |
|---|---|
| Favorites map | Jump to favorite books, chapters, verses, words, and chunks. |
| Inquiry queue graph | Show all user `?` tags and the data generated for each. |
| Word study graph | Start from a source token and show Strong's, same-source uses, English renderings, and tagged notes. |
| Conflict/hot spot view | Personal-only first: places where the user has competing interpretations, unresolved inquiries, or low-confidence job results. |
| Tag cloud/network | Show which tags cluster around which books/chapters/words. |

## Community model

Community features must be optional and separated from personal logic.

### Separation rules

- Personal data remains fully functional offline and private by default.
- Community participation is opt-in at the assertion or package level.
- Community data uses a separate store and namespace.
- Community records cannot overwrite local personal assertions.
- A user can adopt a community item by copying it into personal assertions.
- Community aggregates should be shown as context, not as authority.

### Proposed stores

| Store | Purpose | Required for app function? |
|---|---|---|
| `personal_assertions` | User-owned assertions and tag applications. | Yes. |
| `personal_jobs` | Local analysis jobs and results. | Yes. |
| `personal_graph_projection` | Disposable local graph projection. | No, can rebuild. |
| `community_assertions_cache` | Opt-in downloaded shared assertions. | No. |
| `community_aggregates_cache` | Counts, hot spots, poll summaries. | No. |
| `community_outbox` | User-approved contributions waiting to sync. | No. |

### Community tags

Community tags can exist, but they should not replace personal tags.

| Type | Example | Rule |
|---|---|---|
| System tag | `tag:question`, `tag:inquiry`, `tag:favorite` | Packaged with app. |
| User tag | `tag:custom_covenant_theme` | Private/local unless shared. |
| Community tag | `community-tag:translation_dispute` | Downloaded/optional, visible only when community layer is enabled. |
| Adopted community tag | `tag:custom_translation_dispute` or linked alias | Personal copy with provenance. |

### Community hot spots

A hot spot should be an aggregate, not a command to the user.

Examples:

- Many opted-in users tagged the same word with `tag:inquiry`.
- Many users disagree on an interpretation proposition.
- Same English rendering maps to multiple Hebrew/Greek terms in a heavily questioned passage.
- Poll responses show high disagreement.
- A job result has low confidence and many matching inquiries.

## Feature state matrix

| Feature | State | Notes |
|---|---|---|
| Verse tags | Implemented | Current UI and storage support verse tags. |
| Custom tag CRUD | Implemented | Includes revision conflict detection and retired tombstones. |
| Tag assertion projection | Implemented | Projects active tag assertions into semantic graph. |
| User data export/import | Implemented | Includes tags, workspace, assertions, polls, packages. |
| Local jobs panel | Implemented | Run/simulate/requeue flows exist. |
| Favorites as tag definition | Planned | Add `tag:favorite` and quick-toggle behavior. |
| Book/chapter favorite buttons | Planned | Needs target-aware tag assertion API. |
| Verse favorite button | Planned | Can reuse verse target once `tag:favorite` exists. |
| Word/source-token favorite | Planned | Needs source-token target and tag UI on reader/interlinear selections. |
| Word chunk/text-span favorite | Planned | Needs text selection anchor and source-token-span target. |
| Target-aware tag API | Planned | Replace or wrap `setVerseTag` with `setTagAssertion`. |
| Word tag picker | Planned | Reuse current selection/follow context and Strong's/interlinear token identity. |
| User inquiry tag (`tag:inquiry`) | Planned | Separate from textual `tag:question`; rendered as `?`. |
| `?` queues inquiry-analysis | Planned | Add idempotent job trigger, processor, and result rendering. |
| Deterministic inquiry-analysis processor | Planned | Use local datasets first; no external dependency. |
| Personal graph panel | Planned | Build from assertion projection plus packaged graph and job results. |
| Graph visuals | Planned | Start with scoped graph views, not a giant all-data canvas. |
| Community data model | Future | Design store contracts before network features. |
| Community contribution sync | Future | Opt-in only. |
| Community hot spots | Future | Aggregates only; personal features do not depend on them. |
| Interpretation communication/polls | Future | Poll store exists; UI and community sync remain future. |

## Implementation phases

### Phase 1: Schema and local tag foundation

1. Add `tag:favorite` and `tag:inquiry` to packaged semantic definitions and default runtime tags; preserve textual `tag:question` with an explicit picker label.
2. Add tag definition behavior metadata: `display_behavior` and optional `on_apply_job_type`.
3. Add target constructors for `book`, `chapter`, `verse_range`, `text_span`, `source_token`, and `source_token_span`.
4. Add deterministic target IDs and assertion IDs for every supported target type.
5. Add `setTagAssertion(state, target, tagId, enabled, options)` and keep `setVerseTag` as a compatibility wrapper.
6. Add a versioned migration from legacy verse-key assertions to complete canonical targets.
7. Add target indexes separate from `verse_tags`; keep `verse_tags` as a rebuildable compatibility projection.
8. Add an idempotent behavior-trigger key based on assertion ID, job type, and input revision.
9. Add tests for every target type, legacy migration, rejection/quarantine, duplicate-trigger prevention, and export/import.

### Phase 2: Favorites UI

1. Add favorite star for current book.
2. Add favorite star for current chapter.
3. Add favorite star for verse rows and verse context tabs.
4. Add favorite action to reader text selection menu.
5. Add favorite action to interlinear/source-token cards.
6. Add Favorites panel grouped by book, chapter, verse, English span, source token, and source-token span.
7. Add tests for toggling favorites and preserving them across reload/export/import.

### Phase 3: Word and chunk tagging

1. Reuse reader word-map spans for English text targets.
2. Reuse interlinear token identity for source-token targets.
3. Add source-token-span selection where contiguous token chunks are selected.
4. Add a unified tag picker that receives a target object instead of a verse key.
5. Show badges on reader spans and interlinear cards when tags exist.
6. Add drift handling for text spans using existing text snapshot logic.
7. Add tests for English word, Greek/Hebrew token, and chunk tags.

### Phase 4: Inquiry-analysis jobs

1. Add `inquiry-analysis` to job types and analysis manifest.
2. Register processor in `job-processor.js`.
3. Queue the job when `tag:inquiry` is applied to any supported target.
4. Produce structured deterministic findings from local data.
5. Render inquiry-analysis results in Jobs and in an Inquiry detail view.
6. Add stale-result invalidation when related tags, drafts, or token renderings change.
7. Add tests for queued job, deduplicated trigger, run result, stale result, cancellation, and missing-data warnings.

### Phase 5: Personal graph UI

1. Add graph projection builder that combines assertion graph, packaged graph snippets, and job graph patches.
2. Add a graph detail panel with scoped entry points: current verse, selected word, favorites, and inquiries.
3. Render graph views as useful constrained visuals: grouped lists, small network, paths, and conflict cards.
4. Add filters for personal-only, packaged-only, and combined view.
5. Add tests for graph nodes/edges generated by favorites and inquiry tags.

### Phase 6: Optional community layer

1. Define community record schemas separately from personal assertion schemas.
2. Add community feature flag and explicit opt-in UI.
3. Add import/cache of community aggregates without requiring sign-in.
4. Add contribution outbox requiring explicit user action.
5. Add community hot spot views as overlays, not personal data mutations.
6. Add tests proving disabling community leaves all personal features functional.

## Immediate next task list

1. Implement canonical target constructors, IDs, and target-aware assertions while keeping existing verse tags working.
2. Separate textual `tag:question` from user `tag:inquiry`; add behavior metadata and idempotent triggers.
3. Add `tag:favorite` and render it as a definition-driven quick-toggle star.
4. Add migration, export/import, recovery, and duplicate-trigger tests.
5. Add Favorites panel grouped by target type.
6. Add word/source-token tagging from the Interlinear panel first, because token identity is already explicit there.
7. Add reader text-span tagging second, using existing word-map spans and text snapshots.
8. Add `inquiry-analysis` job type and deterministic processor.
9. Add personal graph projection for favorites and inquiries.
10. Only after the personal graph is solid, add community-cache schema and opt-in UI.

## Non-goals for the next build step

- Do not require accounts, servers, or network sync for favorites, word tags, or inquiry analysis.
- Do not let community data write into personal stores automatically.
- Do not store ambiguous word targets without translation, testament, book, chapter, verse, and token/span identity.
- Do not make external AI a hard dependency for local analysis jobs.
- Do not render a giant graph first; start with scoped visuals tied to the user's selected target.
- Do not repurpose `tag:question` as user uncertainty; use `tag:inquiry`.
