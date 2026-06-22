import {
  fetchLexiconEntry,
  fetchVerseBook,
  fetchWordMapBook,
  loadLanguageMetadata,
} from "../data-service.js?v=clean-app-v1-fixes1";
import { isDetailHoverLocked, setDetail, textNode } from "../dom.js?v=clean-app-v1-detail-context2";
import { capabilityMessage } from "../capabilities.js?v=clean-app-v1-capabilities1";
import { languageUnitTooltip, setLanguageTextWithTooltips } from "../language-tooltips.js?v=clean-app-v1-word-tooltip1";
import { analyzeOriginalWord, gematriaValueForUnit, wordHasLanguageScript } from "../language.js?v=clean-app-v1-sofit4";
import { createVerseContextTabs } from "./verse-context-tabs.js?v=clean-app-v1-contexttabs1";

function languageTitle(language) {
  return language === "hebrew" ? "Hebrew" : "Greek";
}

function displayMarkChar(record) {
  const char = record.mark?.char || record.char || "";
  return char.match(/\p{Mark}/u) ? `\u25CC${char}` : char;
}

function renderMarkPill(record) {
  const mark = record.mark;
  const pill = document.createElement("span");
  pill.className = mark ? "mark-pill" : "mark-pill unknown-mark";
  const glyph = document.createElement("span");
  glyph.className = "mark-glyph";
  glyph.textContent = displayMarkChar(record);
  const label = document.createElement("span");
  label.className = "mark-label";
  label.textContent = mark?.short_label || mark?.name || record.code_point;
  pill.title = [mark?.name, record.code_point, mark?.category, mark?.description].filter(Boolean).join(" - ");
  pill.append(glyph, label);
  return pill;
}

function tokenWordInfo(token) {
  return {
    meaning: token.english || token.gloss || token.short_definition || "",
    strongCode: token.strong_code || "",
    transliteration: token.transliteration || "",
  };
}

function renderWordBreakdown(analysis, wordInfo = null) {
  const section = document.createElement("section");
  section.className = `language-breakdown ${analysis.language}`;

  const title = document.createElement("h4");
  title.textContent = `${languageTitle(analysis.language)} word breakdown`;
  section.append(title);

  const letters = document.createElement("div");
  letters.className = "letter-breakdown";
  analysis.units.forEach((unit) => {
    const letter = document.createElement("span");
    letter.className = unit.standalone ? "letter-unit mark-unit" : "letter-unit";
    letter.dataset.tooltip = languageUnitTooltip(unit, analysis.language, { wordInfo });
    letter.setAttribute("aria-label", letter.dataset.tooltip);
    letter.tabIndex = 0;

    const glyph = document.createElement("span");
    glyph.className = "letter-glyph";
    glyph.textContent = unit.char;

    const name = document.createElement("span");
    name.className = "letter-name";
    const markName = unit.marks[0]?.mark?.name;
    name.textContent = unit.letter?.name || markName || unit.code_point;

    const value = document.createElement("span");
    value.className = "letter-value";
    const gematriaValue = gematriaValueForUnit(unit);
    value.textContent =
      analysis.language === "hebrew" && gematriaValue
        ? `${unit.letter?.transliteration || ""} = ${gematriaValue}`
        : unit.letter?.transliteration || unit.letter?.sound || "";

    letter.append(glyph, name, value);
    letters.append(letter);
  });
  section.append(letters);

  if (analysis.language === "hebrew") {
    const gematriaTotal = analysis.units.reduce((sum, unit) => sum + gematriaValueForUnit(unit), 0);
    const total = document.createElement("div");
    total.className = "gematria-total";
    const label = document.createElement("span");
    label.textContent = "Gematria total";
    const value = document.createElement("strong");
    value.textContent = String(gematriaTotal);
    total.append(label, value);
    section.append(total);
  }

  const markRecords = analysis.units.flatMap((unit) => unit.marks || []);
  if (markRecords.length) {
    const marksTitle = document.createElement("h5");
    marksTitle.textContent = `${languageTitle(analysis.language)} marks / symbols`;
    const marks = document.createElement("div");
    marks.className = "mark-list";
    markRecords.forEach((record) => marks.append(renderMarkPill(record)));
    section.append(marksTitle, marks);
  }

  if (analysis.unknown_marks.length) {
    const warning = document.createElement("p");
    warning.className = "unknown-mark-note";
    warning.textContent = `Unknown marks found: ${analysis.unknown_marks.map((record) => record.code_point).join(", ")}`;
    section.append(warning);
  }

  return section;
}

function appendLanguageBreakdown(container, token, sourceWord = token.original) {
  const language = token.language;
  if ((language !== "hebrew" && language !== "greek") || !wordHasLanguageScript(sourceWord, language)) {
    return false;
  }

  const slot = document.createElement("div");
  slot.className = "language-breakdown-slot";
  slot.textContent = "Loading word breakdown...";
  container.append(slot);

  loadLanguageMetadata(language)
    .then((metadata) => {
      if (!metadata) return;
      const analysis = analyzeOriginalWord(sourceWord, language, metadata);
      slot.replaceChildren(renderWordBreakdown(analysis, tokenWordInfo(token)));
    })
    .catch(() => {
      slot.textContent = "Word breakdown could not be loaded.";
    });

  return true;
}

function createInternalStrongButton(item, label = item?.strong_code || item?.label || "Strong's", openStrongCode) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "strong-inline-link";
  button.textContent = label;
  button.disabled = !item?.strong_code;
  button.addEventListener("click", () => {
    if (item?.strong_code) openStrongCode(item.strong_code, item.language);
  });
  return button;
}

function appendStrongNavigation(container, entry, openStrongCode) {
  const navItems = [entry?.navigation?.previous, entry?.navigation?.next].filter(Boolean);
  if (!navItems.length) return;

  const nav = document.createElement("div");
  nav.className = "strong-nav";
  navItems.forEach((item, index) => {
    const label = `${index === 0 ? "Previous" : "Next"} ${item.strong_code || item.label || ""}`.trim();
    nav.append(createInternalStrongButton(item, label, openStrongCode));
  });
  container.append(nav);
}

function appendLexicalRow(list, label, value, language = null) {
  if (!value) return;
  const term = document.createElement("dt");
  term.textContent = label;
  const detail = document.createElement("dd");
  if (value instanceof Node) {
    detail.append(value);
  } else {
    if (language) {
      setLanguageTextWithTooltips(detail, value, language);
    } else {
      detail.textContent = value;
    }
  }
  list.append(term, detail);
}

function createOriginValue(entry, openStrongCode) {
  if (!entry?.word_origin && !entry?.word_origin_refs?.length) return null;
  const wrap = document.createElement("span");
  wrap.className = "word-origin-value";
  if (entry.word_origin) wrap.append(textNode(entry.word_origin));
  (entry.word_origin_refs || []).forEach((ref) => {
    wrap.append(textNode(" "));
    wrap.append(createInternalStrongButton(ref, ref.strong_code || ref.label, openStrongCode));
  });
  return wrap;
}

function appendLexicalSummary(container, entry, openStrongCode) {
  const section = document.createElement("section");
  section.className = "lexical-summary";
  const heading = document.createElement("h4");
  heading.textContent = "Lexical summary";
  const rows = document.createElement("dl");

  appendLexicalRow(rows, "Original word", entry.original_word, entry.language);
  appendLexicalRow(rows, "Transliteration", entry.transliteration);
  appendLexicalRow(rows, "Phonetic spelling", entry.phonetic_spelling);
  appendLexicalRow(rows, "Part of speech", entry.part_of_speech);
  appendLexicalRow(rows, "Short definition", entry.short_definition);
  if (entry.meaning && entry.meaning !== entry.short_definition) {
    appendLexicalRow(rows, "Meaning", entry.meaning);
  }
  appendLexicalRow(rows, "KJV renderings", entry.kjv_renderings);
  appendLexicalRow(rows, "Word origin", createOriginValue(entry, openStrongCode));
  appendLexicalRow(rows, "Concordance definition", entry.concordance_definition);

  if (!rows.children.length) return;
  section.append(heading, rows);
  container.append(section);
}

function cleanStrongCode(value) {
  const match = String(value || "").match(/^([HG])0*(\d+)/i);
  return match ? `${match[1].toUpperCase()}${Number(match[2])}` : String(value || "");
}

function mapRowToSpan(row, verseText) {
  if (!Array.isArray(row)) return null;
  const start = Number(row[2]);
  const end = Number(row[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return {
    strongTokenIndex: row[0],
    sourceTokenIndex: row[1],
    start,
    end,
    strongCode: cleanStrongCode(row[4]),
    language: row[5],
    text: String(verseText || "").slice(start, end),
  };
}

function findWordMapSpan(wordMapBook, chapter, verse, token, verseText) {
  const rows = wordMapBook?.chapters?.[String(chapter)]?.[String(verse)] || [];
  const strongCode = cleanStrongCode(token.strong_code);
  const tokenIndex = Number(token.token_index ?? token.index ?? token.strong_token_index);
  const candidates = rows
    .map((row) => mapRowToSpan(row, verseText))
    .filter((span) => span?.strongCode === strongCode);
  if (!candidates.length) return null;
  if (Number.isFinite(tokenIndex)) {
    const exact = candidates.find((span) => Number(span.strongTokenIndex) === tokenIndex);
    if (exact) return exact;
  }
  return candidates[0];
}

function verseTextFromBook(book, chapter, verse) {
  return cleanRenderedVerseText(book?.chapters?.[String(chapter)]?.[String(verse)] || "");
}

function cleanRenderedVerseText(value) {
  return String(value || "")
    .replace(/\|/g, '"')
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function appendRenderingRow(list, { label, value, note, exact = false }) {
  if (!value) return;
  const row = document.createElement("div");
  row.className = exact ? "translation-rendering-row exact" : "translation-rendering-row";
  const heading = document.createElement("div");
  heading.className = "translation-rendering-label";
  heading.textContent = label;
  const text = document.createElement("div");
  text.className = "translation-rendering-value";
  text.textContent = value;
  row.append(heading, text);
  if (note) {
    const noteLine = document.createElement("div");
    noteLine.className = "translation-rendering-note";
    noteLine.textContent = note;
    row.append(noteLine);
  }
  list.append(row);
}

function appendTranslationRenderings(container, token, options = {}, viewCtx = null) {
  if (!viewCtx || !token.strong_code || !options.verseContext) return;
  const { bookId, chapter } = viewCtx.state;
  const verse = options.verseContext.verse;
  if (!bookId || !chapter || !verse) return;

  const section = document.createElement("section");
  section.className = "translation-renderings";
  const heading = document.createElement("h4");
  heading.textContent = "Translation renderings";
  const list = document.createElement("div");
  list.className = "translation-rendering-list";
  const status = document.createElement("p");
  status.className = "translation-rendering-note";
  status.textContent = "Loading translation renderings...";
  section.append(heading, status, list);
  container.append(section);

  Promise.all([fetchVerseBook("bsb", bookId), fetchWordMapBook("bsb", bookId)])
    .then(async ([bsbBook, wordMapBook]) => {
      if (!section.isConnected) return;
      list.replaceChildren();
      const bsbVerse = verseTextFromBook(bsbBook, chapter, verse);
      const bsbSpan = findWordMapSpan(wordMapBook, chapter, verse, token, bsbVerse);

      if (bsbSpan?.text) {
        appendRenderingRow(list, {
          label: "BSB",
          value: bsbSpan.text,
          note: "Exact mapped word or phrase span",
          exact: true,
        });
      } else {
        appendRenderingRow(list, {
          label: "BSB",
          value: bsbVerse,
          note: "Verse context; no exact BSB word-map span found for this token",
        });
      }

      const translations = (viewCtx.state.manifest?.translations || [])
        .filter((translation) => translation?.id && !["bsb", "wlc", "wlco", "nestle", "tr94"].includes(translation.id))
        .slice(0, 24);

      const loadedRows = await Promise.all(
        translations.map(async (translation) => {
          const book = await fetchVerseBook(translation.id, bookId);
          const text = verseTextFromBook(book, chapter, verse);
          if (!text) return null;
          return {
            label: translation.code || translation.id.toUpperCase(),
            value: text,
            note: "Verse context; exact word alignment pending",
          };
        }),
      );

      loadedRows.filter(Boolean).forEach((row) => appendRenderingRow(list, row));
      status.textContent = bsbSpan?.text
        ? "Exact spans are shown where generated word maps exist; other translations show verse context until their word maps are built."
        : "Other translations show verse context until their word maps are built.";
    })
    .catch(() => {
      if (section.isConnected) status.textContent = "Translation renderings could not be loaded.";
    });
}

function appendLexiconConcordance(container, entry) {
  const sections = [];
  const seen = new Set();

  if (entry.strongs_concordance) {
    sections.push(["Strong's Concordance", entry.strongs_concordance, true]);
    seen.add("Strong's Concordance");
  }

  Object.entries(entry.sections || {}).forEach(([label, text]) => {
    if (!text || seen.has(label)) return;
    sections.push([label, text, false]);
    seen.add(label);
  });

  if (!sections.length) return;

  const wrap = document.createElement("section");
  wrap.className = "lexicon-sections";
  const heading = document.createElement("h4");
  heading.textContent = "Concordance and lexicon notes";
  wrap.append(heading);

  sections.forEach(([label, text, open]) => {
    const details = document.createElement("details");
    details.className = "lexicon-section";
    details.open = Boolean(open);
    const summary = document.createElement("summary");
    summary.textContent = label;
    const body = formatLexiconText(text);
    body.className = "concordance-text";
    details.append(summary, body);
    wrap.append(details);
  });

  container.append(wrap);
}

function formatLexiconText(text) {
  const body = document.createElement("div");
  const normalized = String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\s+—\s*/g, " — ")
    .replace(/([.;])\s+(\d+\s+[A-Za-z])/g, "$1\n$2")
    .replace(/\n(?=\d+\s)/g, "\n\n");
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  (paragraphs.length ? paragraphs : [normalized.trim()]).forEach((paragraph) => {
    const line = document.createElement("p");
    line.className = /^\d+\s/.test(paragraph) ? "lexicon-line section-line" : "lexicon-line";
    line.textContent = paragraph;
    body.append(line);
  });
  return body;
}

function compactDefinition(entry) {
  return (
    entry?.short_definition ||
    entry?.meaning ||
    entry?.concordance_definition ||
    String(entry?.strongs_concordance || "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ||
    ""
  );
}

function joinSummaryParts(parts) {
  return parts.filter(Boolean).join(" / ");
}

function setOptionalLine(node, value) {
  const text = String(value || "").trim();
  node.hidden = !text;
  node.textContent = text;
}

export function createStrongsView(ctx = null) {
  let strongPinned = false;

  function clearStrongPin() {
    strongPinned = false;
  }

  function openStrongCode(strongCode, language) {
    ctx?.clearReaderHighlight?.();
    showStrong(
      {
        strong_code: strongCode,
        language,
      },
      { pin: true, force: true, forceHistory: true },
    );
  }

  function showStrong(token, options = {}) {
    if (!ctx?.canUseCapability?.("strongs-overlay")) {
      if (!options.hover) setDetail("Strong's", document.createTextNode(capabilityMessage(ctx?.getCapabilityState?.("strongs-overlay"))));
      return;
    }
    if (options.hover && isDetailHoverLocked()) return;
    if (options.hover && !isDetailHoverLocked() && strongPinned) strongPinned = false;
    if (strongPinned && !options.pin && !options.force) return;
    if (options.pin) strongPinned = true;

    const wrap = document.createElement("div");
    wrap.className = "strong-detail";
    const heading = document.createElement("h3");
    heading.textContent = token.english || token.original || token.strong_code || "Strong's entry";

    const overview = document.createElement("section");
    overview.className = "strong-overview";
    const overviewLabel = document.createElement("div");
    overviewLabel.className = "strong-overview-label";
    overviewLabel.textContent = token.english ? "Selected span" : "Lexicon entry";

    const code = document.createElement("p");
    code.className = "strong-overview-code";
    const codeText = document.createElement("span");
    codeText.className = "strong-code";
    codeText.textContent = token.strong_code || "No Strong's number";
    code.append(codeText);

    const sourceWordDisplay = document.createElement("p");
    sourceWordDisplay.className = "strong-source-word";

    const original = document.createElement("p");
    original.className = "strong-overview-original";

    const gloss = document.createElement("p");
    gloss.className = "strong-overview-gloss";

    function renderOverview(entry = null) {
      if (!token.english && entry) {
        heading.textContent = entry.summary || entry.title || token.strong_code || "Strong's entry";
      }
      overviewLabel.textContent = token.english ? "Selected span" : "Lexicon entry";
      const sourceWord = entry?.original_word || token.original || "";
      setOptionalLine(sourceWordDisplay, sourceWord);
      if (sourceWord) {
        sourceWordDisplay.classList.toggle("rtl-text", (token.language || entry?.language) === "hebrew");
        setLanguageTextWithTooltips(sourceWordDisplay, sourceWord, token.language || entry?.language);
      }
      const summaryText = joinSummaryParts([
        sourceWord,
        token.transliteration || entry?.transliteration,
        token.morphology || entry?.part_of_speech,
      ]);
      setOptionalLine(original, summaryText);
      if (summaryText && sourceWord) setLanguageTextWithTooltips(original, summaryText, token.language || entry?.language);
      gloss.textContent = token.gloss || compactDefinition(entry) || (entry ? "No short definition available." : "Loading lexical summary...");
    }

    renderOverview();
    overview.append(overviewLabel, sourceWordDisplay, code, original, gloss);
    wrap.append(heading);
    if (options.verseContext && !options.hover && ctx) {
      wrap.append(createVerseContextTabs(ctx, options.verseContext.reference, options.verseContext.verse, "strongs"));
    }
    wrap.append(overview);
    const renderedTokenBreakdown = appendLanguageBreakdown(wrap, token);
    setDetail("Strong's", wrap, {
      history: options.hover ? "replace" : "push",
      transient: Boolean(options.hover),
      forceHistory: Boolean(options.forceHistory || options.pin || options.force),
    });

    if (!token.strong_code) {
      appendTranslationRenderings(wrap, token, options, ctx);
      return;
    }

    const extra = document.createElement("div");
    extra.className = "lexicon-extra";
    extra.textContent = "Loading lexicon entry...";
    wrap.append(extra);
    appendTranslationRenderings(wrap, token, options, ctx);

    fetchLexiconEntry(token.strong_code)
      .then((entry) => {
        if (!wrap.isConnected) return;
        extra.replaceChildren();
        if (!entry) {
          extra.textContent = "No lexicon entry found.";
          return;
        }
        const title = document.createElement("h4");
        title.textContent = entry.summary || entry.title || token.strong_code;
        renderOverview(entry);
        extra.append(title);
        appendStrongNavigation(extra, entry, openStrongCode);
        appendLexicalSummary(extra, entry, openStrongCode);
        if (!renderedTokenBreakdown && entry.original_word) {
          appendLanguageBreakdown(extra, { ...token, language: entry.language || token.language }, entry.original_word);
        }
        appendLexiconConcordance(extra, entry);
      })
      .catch(() => {
        if (wrap.isConnected) extra.textContent = "Lexicon entry could not be loaded.";
      });
  }

  return { appendLanguageBreakdown, clearStrongPin, showStrong };
}
