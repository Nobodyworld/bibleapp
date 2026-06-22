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
