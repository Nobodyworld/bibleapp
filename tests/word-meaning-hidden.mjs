#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [contextCss, wordMeaningSource, indexHtml] = await Promise.all([
  readFile(new URL("../app/styles-context.css", import.meta.url), "utf8"),
  readFile(new URL("../app/src/word-meaning.js", import.meta.url), "utf8"),
  readFile(new URL("../app/index.html", import.meta.url), "utf8"),
]);

assert.match(
  contextCss,
  /\.word-meaning-menu\[hidden\]\s*\{[^}]*display:\s*none\s*;/s,
  "hidden Meaning dialogs must have an author-level display:none rule",
);
assert.match(
  wordMeaningSource,
  /menu\.hidden\s*=\s*true;/,
  "Meaning dialogs must initialize and close through the hidden property",
);
assert.match(
  indexHtml,
  /styles-context\.css/,
  "the stylesheet containing the hidden-dialog override must be loaded by the app shell",
);

console.log("word meaning hidden-dialog contract passed");
