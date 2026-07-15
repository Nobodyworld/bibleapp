#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  clearActiveWordContext,
  getActiveWordContext,
  setActiveWordContext,
} from "../app/src/active-word-context.js";
import {
  PANEL_CONTEXT_TOOL_MATRIX,
  PANEL_SCOPE_LABELS,
  PANEL_SCOPE_ORDER,
  panelContextSummary,
  panelScopeSequence,
  panelToolsForScope,
} from "../app/src/panel-context-model.js";

assert.deepEqual(PANEL_SCOPE_ORDER, ["word", "verse", "chapter", "book", "global"]);
assert.equal(PANEL_SCOPE_LABELS.word, "Word");
assert.equal(PANEL_SCOPE_LABELS.verse, "Verse");
assert.equal(PANEL_SCOPE_LABELS.chapter, "Chapter");
assert.equal(PANEL_SCOPE_LABELS.book, "Book");

assert.deepEqual(
  panelScopeSequence({ word: true, verse: true }),
  ["word", "verse"],
);
assert.deepEqual(
  panelScopeSequence({ verse: true }),
  ["verse"],
);
assert.deepEqual(
  panelToolsForScope("verse").map((tool) => tool.id),
  ["par", "refs", "commentary", "interlinear"],
);
assert.deepEqual(panelToolsForScope("word").map((tool) => tool.id), ["strongs", "hebrew", "greek"]);
assert.deepEqual(panelToolsForScope("chapter"), []);
assert.deepEqual(panelToolsForScope("book"), []);

for (const [scope, tools] of Object.entries(PANEL_CONTEXT_TOOL_MATRIX)) {
  tools.forEach((tool) => {
    assert.equal(tool.scope, scope, `${tool.id} must remain attached to ${scope} scope`);
    assert.ok(tool.label, `${tool.id} must have a full visible label`);
    assert.ok(tool.shortLabel, `${tool.id} must keep a stable short automation label`);
  });
}

assert.equal(
  panelContextSummary({
    reference: "Psalms 23:1",
    wordContext: { token: { original: "יְהוָה", strong_code: "H3068" } },
  }),
  "יְהוָה · H3068 · in Psalms 23:1",
);
assert.equal(panelContextSummary({ reference: "Psalms 23:1" }), "Psalms 23:1");

const activeContextFixture = { studyContext: {} };
const storedContext = setActiveWordContext(activeContextFixture, {
  token: { original: "מָשָׁל", strong_code: "H4912" },
  options: { verseContext: { verse: "1", reference: "Proverbs 1:1" }, forceHistory: true },
});
assert.equal(storedContext.options.forceHistory, false);
assert.equal(getActiveWordContext(activeContextFixture, "1")?.token.strong_code, "H4912");
assert.equal(getActiveWordContext(activeContextFixture, "2"), null);
clearActiveWordContext(activeContextFixture);
assert.equal(getActiveWordContext(activeContextFixture, "1"), null);

const [index, contextCss, tabsSource, detailViewsSource, browserSource] = await Promise.all([
  readFile(new URL("../app/index.html", import.meta.url), "utf8"),
  readFile(new URL("../app/styles-context.css", import.meta.url), "utf8"),
  readFile(new URL("../app/src/views/verse-context-tabs.js", import.meta.url), "utf8"),
  readFile(new URL("../app/src/detail-views.js", import.meta.url), "utf8"),
  readFile(new URL("../app/scripts/panel-context-interaction-test.mjs", import.meta.url), "utf8"),
]);

const detailContextIndex = index.indexOf('id="detailContext"');
assert.ok(detailContextIndex >= 0, "Word/Verse context must be available in the side panel.");
assert.doesNotMatch(index, /class="detail-tool-nav"/);
assert.match(index, /id="showInterlinear"[\s\S]*?Language Study/);
assert.match(index, /id="showOutline"[\s\S]*?Outline/);
assert.match(index, /styles-context\.css\?v=pr13-live-qa-20260711e/);

assert.match(tabsSource, /scope === "word" \|\| scope === "verse"/);
assert.match(tabsSource, /panelToolsForScope\(scope\)/);
assert.match(tabsSource, /ctx\.getActiveWordContext\?\.\(verse\)/);
assert.doesNotMatch(tabsSource, /studyContext\?\.strong/);
assert.match(tabsSource, /dataset\.visibleLabel/);
assert.match(tabsSource, /dataPanelScope|panelScope/);
assert.match(detailViewsSource, /setActiveWordContext/);
assert.match(detailViewsSource, /Object\.defineProperty\(strongsCtx, "studyContext"/);
assert.match(detailViewsSource, /showStrong: createSearchView|createSearchView\(ctx, \{ showStrong \}\)/);
assert.match(tabsSource, /renderStudyMarksTrigger/);
assert.match(tabsSource, /scrollStrongSection/);
assert.match(tabsSource, /reactivatableCurrentWord/);
assert.match(tabsSource, /updateStrongSectionAvailability/);
assert.doesNotMatch(tabsSource, /window\.addEventListener\("strong:sections"/);
assert.match(detailViewsSource, /scrollStrongSection/);
assert.match(browserSource, /mode === "mobile"/);
assert.match(browserSource, /mode === "narrow"/);
assert.match(browserSource, /panelHeaderGap/);
assert.match(contextCss, /\.panel-context-controls\s*{[\s\S]*?flex-wrap:\s*wrap;/);
assert.match(contextCss, /\.verse-context-tab::after\s*{[\s\S]*?content:\s*attr\(data-visible-label\);/);
assert.match(
  contextCss,
  /@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*960px\)[\s\S]*?\.detail-pane\s*{[\s\S]*?top:\s*184px;[\s\S]*?height:\s*calc\(100dvh - 196px\);/,
);
assert.match(contextCss, /@media\s*\(max-width:\s*640px\)[\s\S]*?grid-template-columns:\s*1fr;/);

console.log(
  JSON.stringify(
    {
      status: "ok",
      scopes: PANEL_SCOPE_ORDER.length,
      tools: Object.values(PANEL_CONTEXT_TOOL_MATRIX).flat().length,
      assertions: 39,
    },
    null,
    2,
  ),
);
