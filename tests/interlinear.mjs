#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { summarizeHebrewGematriaTokens } from "../app/src/language.js";
import { normalizeInterlinearVerseTokens, resolveInterlinearVerseTokens } from "../app/src/strongs.js";

const rawTokens = [
  [6, "hoti", "hoti", "Conj", "G3754", 3754, "that", "demonstrative, that", "greek"],
  [10, "hoti", "hoti", "Conj", "G3754", 3754, "", "causative, because", "greek"],
];

const corrected = normalizeInterlinearVerseTokens(rawTokens, {
  bookId: "john",
  chapter: "4",
  verse: "1",
});
assert.equal(corrected[0].english, "that");
assert.equal(corrected[1].english, "because");

const unchanged = normalizeInterlinearVerseTokens(rawTokens, {
  bookId: "john",
  chapter: "4",
  verse: "27",
});
assert.equal(unchanged[1].english, "");

const groupedInterlinear = {
  1: [
    [1, "alpha", "alpha", "N", "G1", 1, "Alpha", "", "greek"],
    [2, "connector", "connector", "Conj", "G2", 2, "", "", "greek"],
    [3, "beta", "beta", "N", "G3", 3, "Beta", "", "greek"],
  ],
};
const groupedStrongs = {
  1: [
    [1, "Alpha", "greek", "G1", 1, "alpha", "N", ""],
    [2, "", "greek", "G2", 2, "connector", "Conj", ""],
    [3, "Beta", "greek", "G3", 3, "beta", "N", ""],
  ],
};
const groupedOptions = {
  rawInterlinearByVerse: groupedInterlinear,
  rawStrongByVerse: groupedStrongs,
  chapterVerses: { 1: "Alpha", 2: "Beta" },
  reference: { bookId: "example", chapter: 1 },
};
const firstVerseTokens = resolveInterlinearVerseTokens({ ...groupedOptions, targetVerse: 1 });
const secondVerseTokens = resolveInterlinearVerseTokens({ ...groupedOptions, targetVerse: 2 });
assert.deepEqual(firstVerseTokens.map((token) => token.token_index), [1, 2]);
assert.deepEqual(secondVerseTokens.map((token) => token.token_index), [3]);
assert.equal(secondVerseTokens[0].verse, "2");

const hebrewMetadata = {
  alphabet: JSON.parse(await readFile(new URL("../app/data/language/hebrew/alphabet.json", import.meta.url), "utf8")),
  marks: JSON.parse(await readFile(new URL("../app/data/language/hebrew/marks.json", import.meta.url), "utf8")),
};
assert.equal(
  summarizeHebrewGematriaTokens(
    [{ language: "hebrew", original: "miš·lê" }],
    hebrewMetadata,
  ),
  null,
);
const actualHebrewGematria = summarizeHebrewGematriaTokens(
  [
    { language: "hebrew", original: "אב" },
    { language: "greek", original: "λόγος" },
  ],
  hebrewMetadata,
);
assert.equal(actualHebrewGematria.total, 3);
assert.equal(actualHebrewGematria.tokens.length, 1);

console.log(
  JSON.stringify(
    {
      status: "ok",
      assertions: 9,
      corrected_reference: "john:4:1:10",
    },
    null,
    2,
  ),
);
