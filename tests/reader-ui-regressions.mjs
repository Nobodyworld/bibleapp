#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [index, css, stylesPolish, app, pickerFlow, renderer, tagsView, strongsView] = await Promise.all([
  readFile(new URL("../app/index.html", import.meta.url), "utf8"),
  readFile(new URL("../app/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../app/styles-polish.css", import.meta.url), "utf8"),
  readFile(new URL("../app/app.js", import.meta.url), "utf8"),
  readFile(new URL("../app/src/reader-picker-flow.js", import.meta.url), "utf8"),
  readFile(new URL("../app/src/chapter-renderer.js", import.meta.url), "utf8"),
  readFile(new URL("../app/src/views/tags-view.js", import.meta.url), "utf8"),
  readFile(new URL("../app/src/views/strongs-view.js", import.meta.url), "utf8"),
]);

const chapterTools = index.match(/<div class="chapter-actions"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)?.[0] || "";
const sideTools = index.match(/<nav class="detail-tool-nav"[\s\S]*?<\/nav>/)?.[0] || "";
const homeButtonMarkup = index.match(/<button id="homeButton"[\s\S]*?<\/button>/)?.[0] || "";

assert(!chapterTools.includes('id="showOutline"'), "Outline must not appear in chapter tools.");
assert(!chapterTools.includes('id="showInterlinear"'), "Interlinear must not appear in chapter tools.");
assert(sideTools.includes('id="showOutline"'), "Outline must remain available in the side panel.");
assert(sideTools.includes('id="showInterlinear"'), "Interlinear must remain available in the side panel.");

assert(/html\s*{\s*overflow-x:\s*clip;/.test(css), "The document must not create a sticky-breaking horizontal overflow container.");
assert(/body\s*{[\s\S]*?overflow-x:\s*clip;/.test(css), "The body must not create a sticky-breaking horizontal overflow container.");
assert(/\.detail-pane\s*{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*76px;[\s\S]*?height:\s*calc\(100dvh - 88px\);/.test(css), "Desktop detail panel must remain viewport-sticky and tall.");
assert(/\.strong-sticky-summary\s*{[\s\S]*?position:\s*static;/.test(css), "Strong summary must not create a second sticky scrolling region.");
assert(/\.verse-favorite-button\s*{[\s\S]*?opacity:\s*0;[\s\S]*?visibility:\s*hidden;/.test(css), "Inactive verse favorites must be hidden until row interaction.");
assert(/@media\s*\(hover:\s*none\)\s*{[\s\S]*?\.verse-favorite-button\s*{[\s\S]*?visibility:\s*visible;/.test(css), "Verse favorites must remain available on touch devices.");
assert(/@media\s*\(min-width:\s*641px\)\s*and\s*\(max-width:\s*1380px\)[\s\S]*?\.chapter-actions \.toolbar-button\s*{[\s\S]*?width:\s*34px;/.test(css), "Workspace controls must compact at intermediate widths.");
assert(/:root\[data-theme="dark"\] \.parallel-verse\.active\s*{[\s\S]*?background:\s*rgba\(148,\s*163,\s*184,\s*0\.12\)/.test(css), "Dark parallel selection must not use a white background.");
assert(/:root\[data-theme="dark"\] \.reader-context-verse\s*{[\s\S]*?background:\s*rgba\(148,\s*163,\s*184,\s*0\.08\)/.test(css), "Dark reader selection must use the calm slate highlight.");
assert(/\.reader-nav-arrow\s*{[\s\S]*?width:\s*20px;[\s\S]*?min-height:\s*56px;/.test(css), "Chapter navigation must remain edge-sliver sized.");
assert(/\.reader-floating-nav\s*{[\s\S]*?top:\s*176px;/.test(css), "Floating chapter navigation must sit below the reader header.");
assert(/\.detail-floating-nav\s*{[\s\S]*?top:\s*18px;[\s\S]*?margin:\s*0 24px 0 0;/.test(css), "Detail history controls must sit slightly lower and left of the panel edge.");
assert(
  /class="scope-favorite-star"/.test(index) &&
    /class="scope-favorite-label"/.test(index) &&
    /querySelector\("\.scope-favorite-star"\)/.test(app),
  "Book and chapter favorites must expose separately styled star and label spans.",
);
assert(
  /id="bookTagControl" class="scope-tag-control"/.test(index) &&
    /id="chapterTagControl" class="scope-tag-control"/.test(index) &&
    /function syncScopeControls\(\)/.test(app) &&
    /renderTargetTagPicker\(target/.test(app),
  "Book and chapter tag controls must mount beside reader scope favorites and reuse target tag pickers.",
);
assert(
  /id="bookPickerButton"/.test(index) &&
    /id="chapterPickerButton"/.test(index) &&
    /\.book-picker-panel\s*{[\s\S]*?grid-template-columns:\s*repeat\(2/.test(css) &&
    /\.chapter-picker-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(6/.test(css),
  "Book and chapter controls must use app-owned picker popovers: testament columns and chapter grid.",
);
assert(/\.fn-marker\s*{[\s\S]*?color:\s*#2347fb;/.test(css), "Footnote markers must use the requested blue.");
assert(
  /reader-picker-flow\.js\?v=reader-picker-flow-20260709/.test(index),
  "The reader picker flow helper must load after the main app module.",
);
assert(
  /ACTIVE_OPTION_SELECTOR = "\.reader-picker-option\.active"/.test(pickerFlow) &&
    /scrollIntoView\(\{[\s\S]*?block:\s*"center",[\s\S]*?inline:\s*"nearest",/.test(pickerFlow),
  "Opening reader pickers must scroll the active option into view.",
);
assert(
  /openChapterPickerAfterBookSelection/.test(pickerFlow) &&
    /#bookPickerPanel \.reader-picker-option/.test(pickerFlow) &&
    /setPickerExpanded\(chapterButton, chapterPanel, true\)/.test(pickerFlow),
  "Selecting a book in the app-owned picker must open chapter selection after navigation.",
);
assert(
  /freezeReaderHighlight\(token\)/.test(pickerFlow) &&
    /MutationObserver\(\(\) => applyFrozenReaderHighlight\(\)\)/.test(pickerFlow) &&
    /#clearDetail/.test(pickerFlow) &&
    /READER_BACKGROUND_RESET_SELECTOR/.test(pickerFlow),
  "Clicked reader Strong's words must stay frozen while browsing side-panel details until an explicit unfreeze action.",
);
assert(
  /@media\s*\(min-width:\s*1024px\)[\s\S]*?\.reader-pane \.verse-row\s*{[\s\S]*?grid-template-columns:\s*58px minmax\(0, 1fr\) 32px;[\s\S]*?gap:\s*12px;/.test(stylesPolish) &&
    /@media\s*\(min-width:\s*1380px\)[\s\S]*?\.reader-pane \.chapter-content\s*{[\s\S]*?padding-inline:\s*28px 24px;/.test(stylesPolish),
  "Wide reader layout must add desktop-only breathing room without changing the mobile base layout.",
);

assert(/function disengageDetailFollow\(\)/.test(app), "Background reset must share the detail-follow disengage path.");
assert(
  /els\.content\?\.addEventListener\("pointerdown"/.test(app) &&
    /event\.pointerType !== "touch"/.test(app) &&
    /chapterSwipeDirection/.test(app),
  "Reader must retain touch chapter swiping.",
);
assert(
  /resetDetailForNavigation\(\)/.test(app),
  "Book, chapter, and translation navigation must clear stale detail-panel content.",
);
assert(/Content-Security-Policy/.test(index), "App shell must declare a Content Security Policy.");
assert(/object-src 'none'/.test(index), "Content Security Policy must block embedded objects.");
assert(/line\.append\(number,\s*document\.createTextNode/.test(renderer), "Reference preview verse numbers must render as superscripts.");
assert(/button\.textContent =/.test(renderer), "Cross-reference button labels must remain plain text.");
assert(/reference-hover-tooltip-title/.test(renderer), "Reference previews must include a passage title bar.");
assert(
  /\.reference-hover-tooltip-layer\s*{[\s\S]*?max-height:\s*calc\(100dvh - 20px\);[\s\S]*?overflow-y:\s*auto;[\s\S]*?pointer-events:\s*auto;/.test(css),
  "Reference hover previews must stay inside the viewport and support scrolling.",
);
assert(
  /referenceHoverTooltipLayer\.addEventListener\("mouseenter",\s*cancelReferenceHoverTooltipHide\)/.test(renderer) &&
    /button\.addEventListener\("mouseleave",\s*scheduleReferenceHoverTooltipHide\)/.test(renderer),
  "Reference hover previews must remain open while the user scrolls them.",
);

assert(
  /rtlNote\.setAttribute\("aria-expanded",\s*"false"\)/.test(strongsView) &&
    /rtlNote\.addEventListener\("click"/.test(strongsView) &&
    /rtlExplanation\.hidden = expanded/.test(strongsView),
  "Hebrew reading-direction affordance must behave as an expandable control.",
);
assert(
  /const markRecords = analysis\.units\.flatMap\(\(unit\) => unit\.marks \|\| \[\]\);/.test(strongsView) &&
    !/base_char/.test(strongsView) &&
    /section\.append\(marksTitle,\s*markStudy,\s*letters\)/.test(strongsView) &&
    /\.mark-study \.mark-study-word\s*{[\s\S]*?text-align:\s*center;/.test(css),
  "Hebrew marks must appear before letters/gematria and keep the studied word centered.",
);
assert(
  /\.language-breakdown\.hebrew \.mark-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(auto-fit, minmax\(96px, 1fr\)\);[\s\S]*?overflow-x:\s*visible;/.test(stylesPolish) &&
    /\.language-breakdown\.hebrew \.mark-glyph\s*{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*42px;[\s\S]*?overflow:\s*visible;/.test(stylesPolish),
  "Hebrew mark pills must stay reachable in narrow panels and must not clip low vowel symbols.",
);
assert(
  /:root\[data-theme="dark"\] \.translation-renderings\s*{[\s\S]*?background:\s*var\(--bg-elevated\)\s*!important;/.test(css) &&
    /:root\[data-theme="dark"\] \.translation-rendering-row\s*{[\s\S]*?background:\s*var\(--panel\)\s*!important;/.test(css),
  "Translation rendering surfaces must respect dark theme colors.",
);
assert(
  /\.strong-sticky-summary > h3\s*{[\s\S]*?border-bottom:\s*1px solid var\(--line\);/.test(css),
  "Strong's summary heading must retain its separator.",
);
assert(
  /class="theme-switch-track"/.test(index) &&
    /class="theme-option theme-sun"/.test(index) &&
    /class="theme-option theme-moon"/.test(index) &&
    /aria-pressed="false"/.test(index),
  "Theme control must expose both theme icons and switch state.",
);
assert(
  /id="statusText" class="header-status"/.test(index) &&
    !homeButtonMarkup.includes('id="statusText"'),
  "Dynamic load status must remain available outside the brand control.",
);
assert(/setMorphologyHelp\(pos,\s*morphology,\s*language\)/.test(strongsView), "Strong's morphology must expose definition help.");
assert(
  /Study Marks by Scripture/.test(tagsView) &&
    /Book\/chapter tags/.test(tagsView) &&
    /English word\/phrase tags/.test(tagsView) &&
    /Source-word tags/.test(tagsView) &&
    /appendStudyMarksByScripture\(ctx,\s*wrap,\s*assertions/.test(tagsView),
  "Study Marks must expose a scripture-centered book/chapter/verse hierarchy.",
);
assert(
  /styles\.css\?v=browser-comments-20260707b/.test(index) &&
    /app\.js\?v=browser-comments-20260707b/.test(index) &&
    !/full-audit-20260701|browser-comments-20260702/.test(index),
  "Browser-visible app and stylesheet entry points must use the current cache-buster key.",
);

console.log(JSON.stringify({ status: "ok", assertions: 44 }, null, 2));
