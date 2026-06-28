export function normalizeToken(raw) {
  return {
    token_index: raw[0],
    english: raw[1],
    language: raw[2],
    strong_code: raw[3],
    strong_number: raw[4],
    original: raw[5],
    morphology: raw[6],
    gloss: raw[7],
  };
}

export function normalizeInterlinearToken(raw) {
  return {
    token_index: raw[0],
    original: raw[1],
    transliteration: raw[2],
    morphology: raw[3],
    strong_code: raw[4],
    strong_number: raw[5],
    english: raw[6],
    gloss: raw[7],
    language: raw[8],
  };
}

const INTERLINEAR_ENGLISH_OVERRIDES = new Map([
  ["john:4:1:10", "because"],
]);

export function normalizeInterlinearVerseTokens(rawTokens, reference = {}) {
  const referencePrefix = [
    reference.bookId,
    reference.chapter,
    reference.verse,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(":");

  return (rawTokens || []).map((raw) => {
    const token = normalizeInterlinearToken(raw);
    const english = INTERLINEAR_ENGLISH_OVERRIDES.get(`${referencePrefix}:${token.token_index}`);
    return english ? { ...token, english } : token;
  });
}

export function mapStrongRanges(verseText, rawTokens) {
  if (!rawTokens || !rawTokens.length) return [];
  const ranges = [];
  let cursor = 0;
  rawTokens.map(normalizeToken).forEach((token) => {
    const needle = String(token.english || "").trim();
    if (!needle) return;
    let offset = verseText.indexOf(needle, cursor);
    if (offset < 0) offset = verseText.indexOf(needle);
    if (offset < 0) return;
    const end = offset + needle.length;
    if (ranges.some((range) => offset < range.end && end > range.start)) return;
    ranges.push({ start: offset, end, token });
    cursor = end;
  });
  return ranges.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function mapStrongChapterRanges(chapterVerses, rawStrongByVerse) {
  if (!chapterVerses || !rawStrongByVerse) return {};

  const verseKeys = Object.keys(chapterVerses).sort((a, b) => Number(a) - Number(b));
  const strongKeys = Object.keys(rawStrongByVerse)
    .filter((key) => rawStrongByVerse[key]?.length)
    .sort((a, b) => Number(a) - Number(b));
  const result = {};

  strongKeys.forEach((strongKey, index) => {
    const startVerse = Number(strongKey);
    const nextStart = Number(strongKeys[index + 1] || Number(verseKeys[verseKeys.length - 1]) + 1);
    const sectionVerses = verseKeys.filter((verse) => Number(verse) >= startVerse && Number(verse) < nextStart);
    let sectionText = "";
    const spans = [];

    sectionVerses.forEach((verse) => {
      const text = chapterVerses[verse];
      if (!text) return;
      if (sectionText) sectionText += " ";
      const start = sectionText.length;
      sectionText += text;
      spans.push({ verse, start, end: sectionText.length });
    });

    mapStrongRanges(sectionText, rawStrongByVerse[strongKey]).forEach((range) => {
      const span = spans.find((item) => range.start >= item.start && range.end <= item.end);
      if (!span) return;
      if (!result[span.verse]) result[span.verse] = [];
      result[span.verse].push({
        start: range.start - span.start,
        end: range.end - span.start,
        token: range.token,
      });
    });
  });

  Object.values(result).forEach((ranges) => ranges.sort((a, b) => a.start - b.start || a.end - b.end));
  return result;
}

export function resolveInterlinearVerseTokens({
  rawInterlinearByVerse,
  rawStrongByVerse,
  chapterVerses,
  targetVerse,
  reference = {},
} = {}) {
  const target = String(targetVerse || "");
  const anchors = Object.keys(rawInterlinearByVerse || {})
    .filter((verse) => rawInterlinearByVerse[verse]?.length)
    .sort((a, b) => Number(a) - Number(b));
  const anchorIndex = anchors.findLastIndex((verse) => Number(verse) <= Number(target));
  if (anchorIndex < 0) return [];

  const anchor = anchors[anchorIndex];
  const nextAnchor = Number(anchors[anchorIndex + 1] || Number.MAX_SAFE_INTEGER);
  if (Number(target) >= nextAnchor) return [];

  const tokens = normalizeInterlinearVerseTokens(rawInterlinearByVerse[anchor], {
    ...reference,
    verse: anchor,
  });
  if (!tokens.length) return [];

  const mappedRanges = mapStrongChapterRanges(chapterVerses || {}, rawStrongByVerse || {});
  const sectionEnd = nextAnchor;
  const mappedVerseByTokenIndex = new Map();
  Object.entries(mappedRanges).forEach(([verse, ranges]) => {
    if (Number(verse) < Number(anchor) || Number(verse) >= sectionEnd) return;
    ranges.forEach((range) => {
      mappedVerseByTokenIndex.set(String(range.token?.token_index ?? ""), String(verse));
    });
  });

  const mappedPositions = tokens
    .map((token, index) => ({
      index,
      verse: mappedVerseByTokenIndex.get(String(token.token_index ?? "")),
    }))
    .filter((item) => item.verse);

  if (!mappedPositions.length) {
    return target === String(anchor) ? tokens.map((token) => ({ ...token, verse: target })) : [];
  }

  return tokens
    .map((token, index) => {
      const exactVerse = mappedVerseByTokenIndex.get(String(token.token_index ?? ""));
      if (exactVerse) return { ...token, verse: exactVerse };
      const previous = [...mappedPositions].reverse().find((item) => item.index < index);
      const next = mappedPositions.find((item) => item.index > index);
      return { ...token, verse: previous?.verse || next?.verse || String(anchor) };
    })
    .filter((token) => token.verse === target);
}
