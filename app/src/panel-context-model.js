export const PANEL_SCOPE_ORDER = Object.freeze(["word", "verse", "chapter", "book", "global"]);

export const PANEL_SCOPE_LABELS = Object.freeze({
  word: "Word",
  verse: "Verse",
  chapter: "Chapter",
  book: "Book",
  global: "Settings",
});

export const PANEL_CONTEXT_TOOL_MATRIX = Object.freeze({
  word: Object.freeze([
    Object.freeze({ id: "strongs", shortLabel: "Word", label: "Word", scope: "word" }),
  ]),
  verse: Object.freeze([
    Object.freeze({ id: "par", shortLabel: "Par", label: "Parallel", scope: "verse" }),
    Object.freeze({ id: "refs", shortLabel: "Refs", label: "References", scope: "verse" }),
    Object.freeze({ id: "commentary", shortLabel: "Cmt", label: "Commentary", scope: "verse" }),
    Object.freeze({ id: "interlinear", shortLabel: "Int", label: "Language", scope: "verse" }),
    Object.freeze({ id: "tags", shortLabel: "Tags", label: "Tags", scope: "verse" }),
  ]),
  chapter: Object.freeze([
    Object.freeze({ id: "interlinearChapter", shortLabel: "Language Study", label: "Language Study", scope: "chapter" }),
  ]),
  book: Object.freeze([
    Object.freeze({ id: "outline", shortLabel: "Outline", label: "Outline", scope: "book" }),
  ]),
  global: Object.freeze([]),
});

export function panelScopeSequence({ word = false, verse = false, chapter = false, book = false, global = false } = {}) {
  const available = { word, verse, chapter, book, global };
  return PANEL_SCOPE_ORDER.filter((scope) => Boolean(available[scope]));
}

export function panelToolsForScope(scope) {
  return PANEL_CONTEXT_TOOL_MATRIX[scope] || Object.freeze([]);
}

function normalizedWordLabel(wordContext) {
  const token = wordContext?.token || wordContext || null;
  if (!token) return "";
  return [token.original, token.strong_code || token.strongCode].filter(Boolean).join(" · ");
}

export function panelContextSummary({ reference = "", wordContext = null } = {}) {
  const word = normalizedWordLabel(wordContext);
  if (word && reference) return `${word} · in ${reference}`;
  return word || String(reference || "");
}
