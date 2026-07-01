#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [index, css, app, renderer] = await Promise.all([
  readFile(new URL("../app/index.html", import.meta.url), "utf8"),
  readFile(new URL("../app/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../app/app.js", import.meta.url), "utf8"),
  readFile(new URL("../app/src/chapter-renderer.js", import.meta.url), "utf8"),
]);

const chapterTools = index.match(/<div class="chapter-actions"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)?.[0] || "";
const sideTools = index.match(/<nav class="detail-tool-nav"[\s\S]*?<\/nav>/)?.[0] || "";

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

console.log(JSON.stringify({ status: "ok", assertions: 20 }, null, 2));
