#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  buildReferenceContext,
  referenceContextKey,
  testamentForBook,
} from "../app/src/reference-context.js";

assert.equal(testamentForBook("genesis"), "old");
assert.equal(testamentForBook("john"), "new");

const context = buildReferenceContext({
  translationId: "bsb",
  bookId: "John",
  chapter: "4",
  verse: "1",
  word: {
    tokenIndex: "10",
    strongCode: "G3754",
    language: "greek",
    original: "hoti",
  },
});

assert.equal(context.translation_id, "bsb");
assert.equal(context.testament, "new");
assert.equal(context.book_id, "john");
assert.equal(context.chapter, 4);
assert.equal(context.verse, 1);
assert.equal(context.word.token_index, 10);
assert.equal(referenceContextKey(context, "verse"), "bsb:new:john:4:1");
assert.equal(referenceContextKey(context, "word"), "bsb:new:john:4:1:10:G3754");
assert(Object.isFrozen(context) && Object.isFrozen(context.word));

console.log(
  JSON.stringify(
    {
      status: "ok",
      assertions: 11,
      verse_key: referenceContextKey(context, "verse"),
      word_key: referenceContextKey(context, "word"),
    },
    null,
    2,
  ),
);
