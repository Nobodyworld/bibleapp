# Study Feature UI Audit (Current Runtime)

## Scope

Read-only audit of study-tool behavior when capabilities are unavailable in the active app package.

## High-Impact Findings

### 1) Disabled controls without clear reason

Current behavior:

- Several toolbar and verse-level controls become disabled when capability data is absent.
- Disabled state does not always explain what is missing or why.

Observed locations:

- Toolbar gating in app state sync.
- Verse-level study button disabled when no crossrefs/interlinear/commentary is available.
- Context tabs (Refs/Cmt/Int) disabled by capability checks.

Risk:

- Users interpret controls as broken rather than intentionally unavailable.

Recommendation:

- Keep study affordances visible.
- On click (or focus), show a short panel message instead of silent disable where possible.
- Standard copy pattern:
  - "Not included in this private build."
  - "Install [Study Data Pack Name] to enable this tool."

### 2) Capability error text is technically correct but not user-friendly

Current behavior:

- Capability messages use package-state language such as "not installed", "dependency missing", or "invalid package definition".

Risk:

- Non-technical users do not know what action to take.

Recommendation:

- Keep technical reasons for diagnostics, but map display copy to plain-language user messages.
- Proposed message layering:
  - Primary: user-facing plain sentence.
  - Secondary (optional): "Details" disclosure with technical reason.

### 3) Search panel hard-blocks when search capability is absent

Current behavior:

- Search opens only when capability is available; otherwise plain technical message appears.

Risk:

- Search appears removed, not temporarily unavailable.

Recommendation:

- Always open Search panel shell.
- Show disabled input with guided empty-state text:
  - "Search indexes are not included in this private build."
  - "Install a search data pack to run verse and study search."

### 4) Translation workspace appears tied to interlinear-only availability

Current behavior:

- Translate action is currently gated by interlinear capability.

Risk:

- Users lose drafting workflow when interlinear data is unavailable, even though draft text entry is still conceptually useful.

Recommendation:

- Preserve workspace entry in draft-first mode.
- Add advanced token/alignment sections only when interlinear/word-map data is present.

### 5) Obsolete control naming in active runtime code

Current behavior:

- A translation workspace button/control is named with a Proverbs-specific identifier.

Risk:

- Internal naming mismatch increases maintenance confusion.

Recommendation:

- Rename stale identifier to feature-accurate naming in a future patch (no runtime behavior change required).

## Empty-State Copy Suggestions

- Refs: "Cross references are not included in this private build. Install the Cross References study pack to enable this tool."
- Commentary: "Commentary data is not included in this private build. Install a commentary pack to read verse notes here."
- Interlinear: "Interlinear data is not included in this private build. Install an interlinear pack to inspect source-language tokens."
- Strong's/Lexicon: "Word study data is not included in this private build. Install a Strong's and lexicon pack to enable this card."
- Outline: "Book outlines are not included in this private build. Install an outline pack to view section structure."
- Search: "Search indexes are not included in this private build. Install a search pack to enable fast lookup."

## UX Direction Summary

- Do not hide study capability as a design choice.
- Keep study tools discoverable from the reader.
- Convert dead/technical states into guided onboarding states.
