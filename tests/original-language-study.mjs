#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [index, styles, flow] = await Promise.all([
  readFile(new URL("../app/index.html", import.meta.url), "utf8"),
  readFile(new URL("../app/styles-polish.css", import.meta.url), "utf8"),
  readFile(new URL("../app/src/original-language-study-flow.js", import.meta.url), "utf8"),
]);

assert(
  /id="showInterlinear"[\s\S]*?title="Original language study"[\s\S]*?>Language Study</.test(index),
  "The side-panel tool must present the feature as Language Study.",
);
assert(
  /original-language-study-flow\.js\?v=original-language-study-20260710/.test(index),
  "The original-language study enhancement module must load after the app modules.",
);
assert(
  /function enhanceVerseSection\(section\)/.test(flow) &&
    /Full source verse/.test(flow) &&
    /Word-by-word study/.test(flow) &&
    /original-language-word-card/.test(flow),
  "The study flow must structure complete source verses and word-level cards.",
);
assert(
  /function enhanceWordCard\(card\)/.test(flow) &&
    /original-language-word-summary/.test(flow) &&
    /original-language-word-source/.test(flow) &&
    /summary[\s\S]*source/.test(flow),
  "Word cards must place meaning and lexical metadata before the source-word block.",
);
assert(
  /MutationObserver\(queueStudyEnhancement\)/.test(flow) &&
    /\.interlinear-verse-section/.test(flow),
  "Lazy-loaded and restored interlinear verses must receive the study-card enhancement.",
);
assert(
  /\.original-language-verse-card\s*{[\s\S]*?display:\s*grid;/.test(styles) &&
    /\.original-language-word-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 220px\), 1fr\)\);/.test(styles),
  "Original-language verse and word cards must use responsive grid layouts.",
);
assert(
  /@media\s*\(max-width:\s*768px\)[\s\S]*?\.original-language-word-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;/.test(styles),
  "Original-language word cards must collapse to one column on narrow screens.",
);

console.log(JSON.stringify({ status: "ok", assertions: 7 }, null, 2));
