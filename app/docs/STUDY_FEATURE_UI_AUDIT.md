# Study Feature UI Audit

Reviewed: 2026-06-29

## Current status

The prior audit focused on absent study packs. Those datasets have since been restored. This table records which findings are resolved and which contracts still matter.

| Finding | State | Current direction |
|---|---|---|
| Outline and Interlinear duplicated in chapter tools | Resolved | Both are side-panel-only; mobile uses the Study panel launcher. |
| Interlinear long words overlap English/gloss text | Resolved | Card columns constrain width and wrap content. |
| Interlinear English rendering missing for aligned token | Resolved for reported John 4 case | Token resolution preserves the expected English rendering, including `hoti` → `because`. |
| Reader/panel token follow-along unreliable | Resolved in manual desktop QA | Match by verse and token index, with unique Strong's fallback. |
| Explicit panel actions do not remain selected | Resolved | Actions lock the panel; disengage/reset/navigation returns to follow mode. |
| Interlinear verse list loads the entire chapter | Resolved | Initial verse plus next-verse lazy append in the detail scroll container. |
| Hebrew-only gematria appears for Greek | Resolved | Hebrew analysis is gated by language/source context. |
| Dark outline navigation highlight obscures text | Resolved | Dark-theme highlight colors preserve readable contrast. |
| Missing capability messaging is technical | Contract retained | Use the fallback matrix when a pack is missing, disabled, corrupt, or has no scoped data. |
| Translation control has stale internal `showProverbs` identifier | Open maintenance issue | Rename when touching the translation launcher; runtime label is already correct. |
| Automated mobile and desktop regression execution | Blocked | Edge/CDP fails before app navigation in the current environment. |

## Interaction rules that must not regress

1. Tool availability distinguishes missing capability from missing scoped data.
2. Locked panels remain stable while hover/focus highlighting continues.
3. Panel history restores the saved view and reactivates view-specific listeners.
4. Greek and Hebrew analysis are language-scoped.
5. Side-panel-only tools remain reachable at mobile widths.
6. Empty states explain the user-visible condition first; technical package state is secondary.

## Next audit focus

The next UI audit should accompany tag Phase 2 and cover:

- favorite controls at book, chapter, verse, English-span, and source-token scope;
- unified target-aware tag picker behavior;
- keyboard/touch equivalence;
- private/personal graph labeling;
- no accidental community or network requirement.
