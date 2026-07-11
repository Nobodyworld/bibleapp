#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { summarizeHebrewGematriaTokens } from "../app/src/language.js";
import { languageUnitText, transliterationSymbolDescription } from "../app/src/language-tooltips.js";
import {
  normalizeInterlinearVerseTokens,
  resolveInterlinearVerseTokens,
  resolveSourceBearingPresentationSegment,
} from "../app/src/strongs.js";

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
assert.equal(
  languageUnitText({ char: "׃", standalone: true, marks: [{ char: "׃" }] }),
  "׃",
);
assert.equal(
  languageUnitText({ char: "א", standalone: false, marks: [{ char: "ְ" }] }),
  "אְ",
);
assert.equal(
  languageUnitText({ char: "Ε", standalone: false, marks: [{ char: "̓" }] }),
  "Ἐ",
);
assert.match(transliterationSymbolDescription("ō"), /macron marking a long o vowel.*not exact pronunciation/i);
assert.match(transliterationSymbolDescription("î"), /circumflex.*vowel distinction or contraction.*not exact pronunciation/i);
assert.match(transliterationSymbolDescription("·"), /separat(?:es|ing) syllables or morphemes.*not pronounced.*not exact pronunciation/i);
assert.equal(transliterationSymbolDescription("x"), "");

const psalmStrong = {
  1: [
    [1, "A Psalm", "hebrew", "H4210", 4210, "מִזְמוֹר", "N", "psalm"],
    [2, "of David", "hebrew", "H1732", 1732, "לְדָוִד", "Np", "David"],
    [3, "The LORD", "hebrew", "H3068", 3068, "יְהוָה", "Np", "LORD"],
    [4, "is my shepherd", "hebrew", "H7462", 7462, "רֹעִי", "V", "shepherd"],
  ],
};
const psalmInterlinear = {
  1: [
    [1, "מִזְמוֹר", "mizmor", "N", "H4210", 4210, "A Psalm", "psalm", "hebrew"],
    [2, "לְדָוִד", "ledavid", "Np", "H1732", 1732, "of David", "David", "hebrew"],
    [3, "יְהוָה", "YHWH", "Np", "H3068", 3068, "The LORD", "LORD", "hebrew"],
    [4, "רֹעִי", "roi", "V", "H7462", 7462, "is my shepherd", "shepherd", "hebrew"],
  ],
};
const superscription = resolveSourceBearingPresentationSegment({
  bookId: "psalms",
  chapter: 23,
  block: { kind: "psalm_superscription", before_verse: "1", text: "A Psalm of David." },
  rawStrongByVerse: psalmStrong,
  rawInterlinearByVerse: psalmInterlinear,
});
assert.equal(superscription.segment_id, "psalms:23:psalm_superscription:1");
assert.deepEqual(superscription.token_indexes, ["1", "2"]);
assert.equal(resolveSourceBearingPresentationSegment({
  bookId: "psalms", chapter: 23,
  block: { kind: "section_heading", before_verse: "1", text: "The LORD Is My Shepherd" },
  rawStrongByVerse: psalmStrong, rawInterlinearByVerse: psalmInterlinear,
}), null);
assert.deepEqual(resolveInterlinearVerseTokens({
  rawInterlinearByVerse: psalmInterlinear,
  rawStrongByVerse: psalmStrong,
  chapterVerses: { 1: "The LORD is my shepherd" },
  targetVerse: 1,
  reference: { bookId: "psalms", chapter: 23 },
  excludedTokenIndexes: superscription.token_indexes,
}).map((token) => token.token_index), [3, 4]);

console.log(
  JSON.stringify(
    {
      status: "ok",
      assertions: 22,
      corrected_reference: "john:4:1:10",
    },
    null,
    2,
  ),
);
