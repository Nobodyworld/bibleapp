#!/usr/bin/env node

import assert from "node:assert/strict";
import { explainMorphology } from "../app/src/morphology-tooltips.js";

const hebrew = explainMorphology("V-Qal-Prtcpl-msc:: 1cs", "hebrew");
assert.match(hebrew.title, /verb/i);
assert.equal(hebrew.partOfSpeech, "verb");
assert.match(hebrew.partOfSpeechDefinition, /action, occurrence, or state of being/i);
assert.match(hebrew.title, /Qal stem/i);
assert.match(hebrew.title, /participle/i);
assert.match(hebrew.title, /masculine singular construct/i);
assert.match(hebrew.title, /first person common singular/i);
assert.deepEqual(
  hebrew.rows.map((row) => row.code),
  ["V", "Qal", "Prtcpl", "msc", "1cs"],
);

const greekVerb = explainMorphology("V-PIA-1S", "greek");
assert.match(greekVerb.title, /verb/i);
assert.match(greekVerb.partOfSpeechDefinition, /action, occurrence, or state of being/i);
assert.match(greekVerb.title, /present/i);
assert.match(greekVerb.title, /indicative/i);
assert.match(greekVerb.title, /active/i);
assert.match(greekVerb.title, /first person singular/i);

const greekNoun = explainMorphology("N-NMS", "greek");
assert.match(greekNoun.title, /noun/i);
assert.match(greekNoun.partOfSpeechDefinition, /person, place, thing, or concept/i);
assert.match(greekNoun.title, /nominative/i);
assert.match(greekNoun.title, /masculine/i);
assert.match(greekNoun.title, /singular/i);

console.log(JSON.stringify({ status: "ok", assertions: 21 }, null, 2));
