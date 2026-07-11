#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  buildReferenceContext,
  referenceContextKey,
  testamentForBook,
} from "../app/src/reference-context.js";

assert.equal(testamentForBook("genesis"), "old");
assert.equal(testamentForBook("john"), "new");
assert.equal(testamentForBook("not_a_book"), null);

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
assert.equal(referenceContextKey(context, "translation"), "bsb");
assert.equal(referenceContextKey(context, "verse"), "bsb:new:john:4:1");
assert.equal(referenceContextKey(context, "word"), "bsb:new:john:4:1:10");
assert(Object.isFrozen(context) && Object.isFrozen(context.word));
assert.throws(
  () => referenceContextKey(buildReferenceContext({ translationId: "bsb", bookId: "unknown" }), "book"),
  /missing testament/,
);
assert.equal(
  buildReferenceContext({ bookId: "john", testament: "invalid" }).testament,
  "new",
);
assert.equal(
  buildReferenceContext({ bookId: "john", testament: "old" }).testament,
  "new",
);
assert.deepEqual(
  buildReferenceContext({
    translationId: " BSB ",
    bookId: " John ",
    word: { strongCode: " g3754 ", language: " Greek " },
  }),
  {
    translation_id: "bsb",
    testament: "new",
    book_id: "john",
    chapter: null,
    verse: null,
    segment_id: null,
    word: {
      token_index: null,
      strong_code: "G3754",
      language: "greek",
      original: null,
    },
  },
);

console.log(
  JSON.stringify(
    {
      status: "ok",
      assertions: 17,
      verse_key: referenceContextKey(context, "verse"),
      word_key: referenceContextKey(context, "word"),
    },
    null,
    2,
  ),
);
