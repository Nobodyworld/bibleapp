#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalBookId,
  extractChapterVerses,
  stableBookJson,
} from "../app/tools/import-original-language-sources.mjs";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures", "original-language-sources");
const fixture = (name) => readFile(resolve(fixtureRoot, name), "utf8");

const wlc = extractChapterVerses(await fixture("wlc-psalms-23.htm"), "hebrew");
const wlco = extractChapterVerses(await fixture("wlco-psalms-23.htm"), "hebrew");
const nestle = extractChapterVerses(await fixture("nestle-john-1.htm"), "greek");
const tr94 = extractChapterVerses(await fixture("tr94-john-1.htm"), "greek");
const emptyGreek = extractChapterVerses(await fixture("nestle-psalms-23.htm"), "greek");

assert.equal(wlc.verses["1"], "מִזְמֹ֥ור לְדָוִ֑ד יְהוָ֥ה רֹ֝עִ֗י לֹ֣א אֶחְסָֽר׃");
assert.equal(wlco.verses["1"], "מזמור לדוד יהוה רעי לא אחסר׃");
assert(!/[A-Za-z]/.test(wlc.verses["1"]), "WLC extraction must not substitute transliteration.");
assert(!/miz|mōwr|Yah|rō|eḥsār/i.test(wlc.verses["1"]), "WLC extraction contains transliteration.");
assert(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(nestle.verses["1"]));
assert(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(tr94.verses["1"]));
assert(!/^\d/.test(nestle.verses["1"]), "Verse navigation number leaked into Greek source text.");
assert.deepEqual(emptyGreek.verses, {}, "Empty non-GNT placeholders must not generate Greek data.");
assert.deepEqual(emptyGreek.emptyReferences, ["1"]);
assert.equal(canonicalBookId("Song of Songs"), "songs");
assert.equal(canonicalBookId("1 Samuel"), "1_samuel");

const duplicate = extractChapterVerses(
  '<p class="hebrew"><span class="reftext"><b>1</b></span>אָב</p><p class="hebrew"><span class="reftext"><b>1</b></span>בֵּן</p>',
  "hebrew",
);
assert.deepEqual(duplicate.duplicates, ["1"]);

const payload = {
  book: { id: "psalms", name: "Psalms", osis: "Ps" },
  chapters: { 23: { 2: "ב", 1: "א" }, 1: { 1: "ג" } },
  translation: { id: "wlc", code: "WLC", name: "Westminster Leningrad Codex" },
};
assert.equal(stableBookJson(payload), stableBookJson(payload), "Importer output must be byte-deterministic.");
assert(stableBookJson(payload).indexOf('"1":{"1"') < stableBookJson(payload).indexOf('"23":{"1"'));

console.log(JSON.stringify({ status: "ok", assertions: 15 }, null, 2));
