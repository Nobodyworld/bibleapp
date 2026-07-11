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

const OLD_TESTAMENT_BOOKS = new Set([
  "genesis",
  "exodus",
  "leviticus",
  "numbers",
  "deuteronomy",
  "joshua",
  "judges",
  "ruth",
  "1_samuel",
  "2_samuel",
  "1_kings",
  "2_kings",
  "1_chronicles",
  "2_chronicles",
  "ezra",
  "nehemiah",
  "esther",
  "job",
  "psalms",
  "proverbs",
  "ecclesiastes",
  "songs",
  "isaiah",
  "jeremiah",
  "lamentations",
  "ezekiel",
  "daniel",
  "hosea",
  "joel",
  "amos",
  "obadiah",
  "jonah",
  "micah",
  "nahum",
  "habakkuk",
  "zephaniah",
  "haggai",
  "zechariah",
  "malachi",
]);

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizedId(value) {
  return String(value || "").trim().toLowerCase() || null;
}

export function testamentForBook(bookId) {
  const normalized = normalizedId(bookId);
  if (!normalized) return null;
  if (NEW_TESTAMENT_BOOKS.has(normalized)) return "new";
  if (OLD_TESTAMENT_BOOKS.has(normalized)) return "old";
  return null;
}

export function buildReferenceContext(input = {}) {
  const bookId = normalizedId(input.book_id || input.bookId);
  const suppliedTestament = normalizedId(input.testament);
  const inferredTestament = testamentForBook(bookId);
  const testament =
    inferredTestament ||
    (suppliedTestament === "old" || suppliedTestament === "new"
      ? suppliedTestament
      : null);
  const word = input.word
    ? {
        token_index: positiveInteger(input.word.token_index ?? input.word.tokenIndex),
        strong_code:
          String(input.word.strong_code || input.word.strongCode || "").trim().toUpperCase() ||
          null,
        language: normalizedId(input.word.language),
        original: String(input.word.original || "") || null,
      }
    : null;
  return Object.freeze({
    translation_id: normalizedId(input.translation_id || input.translationId),
    testament,
    book_id: bookId,
    chapter: positiveInteger(input.chapter),
    verse: positiveInteger(input.verse),
    segment_id: normalizedId(input.segment_id || input.segmentId),
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
  ];
  const segmentNames = ["translation", "testament", "book", "chapter", "verse", "word"];
  const scopeLength = {
    translation: 1,
    testament: 2,
    book: 3,
    chapter: 4,
    verse: 5,
    word: 6,
  }[scope];
  if (!scopeLength) throw new Error(`Unknown reference context scope: ${scope}`);
  const scopedSegments = segments.slice(0, scopeLength);
  const missingIndex = scopedSegments.findIndex((segment) => segment == null || segment === "");
  if (missingIndex >= 0) {
    throw new Error(
      `Incomplete reference context for ${scope}: missing ${segmentNames[missingIndex]}`,
    );
  }
  return scopedSegments.map(String).join(":");
}
