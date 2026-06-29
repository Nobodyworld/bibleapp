# Bible App Visual and Interactive Review

Reviewed: 2026-06-29

## Current implementation

- Explicit light and dark themes are implemented and persisted.
- Desktop uses a reader/detail split; tablet/mobile use responsive layouts with a Study panel launcher.
- Outline and Interlinear live in the side-panel tool navigation.
- Interlinear cards wrap long original-language words, preserve English/gloss separation, and lazy-load by verse.
- Reader and interlinear tokens have bidirectional hover/focus follow-along.
- Dark-theme verse/outline highlights and Hebrew analysis have dedicated contrast handling.
- Search, cross references, commentary, footnotes, Strong's, tags, translation workspace, jobs, and user-data tools are present.

## Latest manual desktop QA

Exercised on 2026-06-29:

1. John 4 reader and interlinear token order.
2. English rendering and long-word wrapping for reported Greek tokens.
3. Lazy append from John 4:1 to John 4:2.
4. Reader token → Strong's detail → panel Back → restored Interlinear behavior.
5. Panel locking and follow-along behavior.
6. Dark Hebrew contrast and language-scoped gematria.
7. Browser console health for the exercised flow.

No relevant console errors were observed in that manual session.

## Automated baseline

```powershell
npm run test:static
npm run test:browser
npm run test:browser:mobile
npm run audit
```

The static suite passes. The browser scripts contain broad desktop/mobile interaction coverage, but Edge/CDP currently fails during `Page.enable` before navigation in this environment. They must not be reported as passing until that runner failure is resolved.

## Remaining visual QA

1. Resolve automated browser startup and run the complete desktop/mobile suites.
2. Exercise mobile panel open/close, scrolling, focus restoration, and token selection manually if automation remains unavailable.
3. Add screenshot-diff baselines only after the tag/favorites controls settle.
4. Add visual coverage for Favorites, inquiry results, and scoped personal graph views as those phases land.
