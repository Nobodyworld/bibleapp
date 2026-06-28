const NEW_TESTAMENT_BOOKS = new Set([
  "matthew",
  "mark",
  "luke",
  "john",
  "acts",
  "romans",
  "1_corinthians",
  "2_corinthians",
  "galatians",
  "ephesians",
  "philippians",
  "colossians",
  "1_thessalonians",
  "2_thessalonians",
  "1_timothy",
  "2_timothy",
  "titus",
  "philemon",
  "hebrews",
  "james",
  "1_peter",
  "2_peter",
  "1_john",
  "2_john",
  "3_john",
  "jude",
  "revelation",
]);

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function testamentForBook(bookId) {
  const normalized = String(bookId || "").toLowerCase();
  if (!normalized) return null;
  return NEW_TESTAMENT_BOOKS.has(normalized) ? "new" : "old";
}

export function buildReferenceContext(input = {}) {
  const bookId = String(input.book_id || input.bookId || "").toLowerCase() || null;
  const word = input.word
    ? {
        token_index: positiveInteger(input.word.token_index ?? input.word.tokenIndex),
        strong_code: String(input.word.strong_code || input.word.strongCode || "") || null,
        language: String(input.word.language || "") || null,
        original: String(input.word.original || "") || null,
      }
    : null;
  return Object.freeze({
    translation_id: String(input.translation_id || input.translationId || "") || null,
    testament: input.testament || testamentForBook(bookId),
    book_id: bookId,
    chapter: positiveInteger(input.chapter),
    verse: positiveInteger(input.verse),
    word: word ? Object.freeze(word) : null,
  });
}

export function referenceContextKey(context, scope = "word") {
  const value = buildReferenceContext(context);
  const segments = [
    value.translation_id,
    value.testament,
    value.book_id,
    value.chapter,
    value.verse,
    value.word?.token_index,
    value.word?.strong_code,
  ];
  const scopeLength = {
    testament: 2,
    book: 3,
    chapter: 4,
    verse: 5,
    word: 7,
  }[scope];
  if (!scopeLength) throw new Error(`Unknown reference context scope: ${scope}`);
  return segments
    .slice(0, scopeLength)
    .map((segment) => String(segment ?? "_"))
    .join(":");
}
