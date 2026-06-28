# Bible App Visual and Interactive Review

Reviewed: 2026-06-27

## Current implementation

- Light and dark themes are implemented in `styles.css` and selected with the header theme control.
- The reader uses a two-pane desktop layout and responsive breakpoints for tablet and mobile widths.
- Study tools include search, outline, interlinear, cross references, commentary, tags, and Strong's details.
- Workspace tools include translation drafts, local jobs, and user-data import/export.
- Keyboard shortcuts include Ctrl/Cmd+K for search, Ctrl/Cmd+G for verse lookup, and Escape for detail reset or mobile-panel close.

## Verification baseline

From the repository root:

```powershell
npm test
npm run audit
npm run serve
```

Open <http://127.0.0.1:8000/>.

Browser verification should cover:

1. Reader initialization and chapter rendering.
2. Translation, book, chapter, and previous/next navigation.
3. Search, outline, interlinear, verse details, and detail history.
4. Theme switching and persistence.
5. Tags, translation workspace, jobs, and user data.
6. Desktop and mobile layout, keyboard focus, and console health.

## Remaining automation work

- Add committed browser smoke tests for the baseline above.
- Add screenshot regression coverage for light, dark, desktop, and mobile states.
- Add explicit focus-management assertions for detail-panel workflows.
