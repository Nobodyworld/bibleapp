# Data Model

The runtime data model is file-backed JSON. The app does not require a server
database for normal study sessions.

## Manifests

- `app/data/manifest.json` is the runtime capability manifest used by the app.
- `app/data/package-manifest.json` describes bundled feature packs, byte sizes,
  shard counts, and package composition.
- `app/data/source-manifest.json` records source package classification,
  retained notices, and transformation notes.

## Bundled Data

Data categories include translation verse shards, commentary shards, search
indexes, cross-references, outlines, lexicons, Strong's mappings, interlinear
records, BSB footnotes, presentation metadata, semantic seeds, word maps, and
cross-reference graph analysis.

## User Data

User-created study state is separate from bundled canonical data. Favorites,
tags, assertions, poll responses, package operations, legacy verse drafts,
personal token renderings, and local job events live in browser storage and can
be exported as portable JSON.

### Personal meanings

`workspaceStore.token_renderings` stores optional personal meanings for exact
canonical schema-v2 `source_token` targets. A rendering is identified by its
translation/reference and source-token index, not by display spelling or a
shared Strong's code. These values are distinct from Favorites and
classification tags: they do not create tag definitions or tag assertions.

Legacy token-rendering records that contain only a rendering, original word,
Strong's code, and update time remain valid. When they are edited, canonical
target metadata is added without rejecting or deleting the saved value.

### Legacy verse drafts and portable exports

`workspaceStore.verse_drafts` remains independent legacy user data. The former
Translation workspace has no primary editing surface, but drafts remain
counted, importable, exportable, merge/replace-compatible, and separate from
personal meanings. Existing `bibleapp:user-data` exports remain compatible,
including exports with legacy token-rendering records or verse drafts.
