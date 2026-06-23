# Study Feature Restore Plan

## Purpose

This plan restores reader-adjacent study utility without changing the current license-scoped package policy. The reader remains the center of the product. Study tools stay one click (or one hover) from the verse text and teach themselves through plain language.

## Product Principles

- Reader first: study actions should always begin from a verse in context.
- Progressive disclosure: simple default view, deeper layers only when requested.
- Explain missing data clearly: the app should feel intentional, not broken.
- Packaging is separate from product model: private/public/commercial constraints control datasets, not UX ambition.

## Desired Reader-Adjacent Navigation

- Verse number click: open parallel text (already familiar behavior).
- Verse study button: always opens a small study launcher for that verse.
- Detail pane context tabs: keep Refs, Cmt, Int, Tags visible as affordances.
- Chapter toolbar: Search, Outline, Interlinear, Translate, Tags, Jobs, Data remain visible.

When a data pack is absent, show a guided empty state rather than dead controls.

## Feature Flows (Ideal User Journey)

### Cross References

1. User clicks a verse study action.
2. User sees Refs first when available.
3. List shows plain labels and short passage snippets.
4. User clicks a reference and jumps to target text with context preserved.

Empty state copy direction:

- "Cross references are not included in this private build."
- "Install the Cross References study data pack to enable this panel."

### Commentary

1. User opens verse study and selects Cmt.
2. User sees 1-3 most relevant commentary excerpts first.
3. User expands source details only when needed.
4. User can jump back to verse without losing location.

Empty state copy direction:

- "Commentary data is not included in this private build."
- "Install a commentary data pack to read verse notes here."

### Footnotes

1. User taps a footnote marker directly in verse text.
2. Footnote opens inline in detail pane with exact verse context.
3. User can move between footnotes without leaving chapter.

Empty state copy direction:

- "Footnotes are not included for this build."
- "Install a footnotes data pack to view note markers and explanations."

### Strong's Overlay and Lexicon

1. User hovers/clicks a tagged word in verse or interlinear card.
2. Card shows short meaning first, then lexical depth on demand.
3. User can navigate previous/next Strong's entries from same card.
4. User can return to verse with highlight retained.

Empty state copy direction:

- "Word study data is not included in this private build."
- "Install the Strong's and lexicon study pack to enable this card."

### Interlinear

1. User opens Interlinear from toolbar or verse tabs.
2. User sees source text + token cards + plain language glosses.
3. User optionally drills into morphology and language breakdown.
4. User can pivot to translation workspace for same verse.

Empty state copy direction:

- "Interlinear data is not included in this private build."
- "Install an interlinear study pack to inspect original-language tokens."

### Outlines

1. User opens Outline for current book.
2. User sees a clean section tree with verse-range links.
3. User jumps back into reader at selected section.

Empty state copy direction:

- "Book outline data is not included in this private build."
- "Install an outlines pack to view section structure."

### Search

1. User opens Search from toolbar.
2. User starts with one query field and simple scope choices.
3. User views ranked, readable results with highlighted matches.
4. User clicks result and lands in reader context.

Empty state copy direction:

- "Search indexes are not included in this private build."
- "Install a search data pack to enable fast study search."

### Tags

1. User clicks Tags from verse tools.
2. User applies one or more tags in one tap.
3. User sees tags reflected immediately in reader and detail pane.
4. User can browse tagged verses by theme.

If no advanced study pack is present, tags still work as local reader annotation.

### Translation Workspace

1. User opens Translate from chapter toolbar.
2. User picks a verse and sees source/canonical text plus draft area.
3. User optionally maps tokens and saves personal rendering.
4. User returns to reader and sees draft status indicators.

If interlinear is unavailable, workspace should still offer draft-first mode with optional advanced token mode when data is installed.

## Suggested Rollout Phases (No Data Policy Changes Implied)

- Phase 1: Empty-state language and launcher UX polish.
- Phase 2: Restore packs with license-approved sources in highest utility order:
  - Cross references + footnotes
  - Outlines + search indexes
  - Strong's + lexicon + interlinear
  - Commentary sources
- Phase 3: Tune flows for speed, clarity, and novice usability.

## Success Criteria

- New user can discover at least three study tools within 60 seconds.
- Missing-data states explain what is absent and how to enable it.
- Advanced data remains optional while core reading stays fast.
- Study interactions remain anchored to the current verse/chapter context.
