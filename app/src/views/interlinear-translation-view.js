import { fetchVerseBook, fetchWordMapBook, loadLanguageMetadata, loadOriginalSourceTexts } from "../data-service.js";
import { createDetailList, els, setDetail, setDetailMessage, textNode } from "../dom.js?v=interaction-qa-20260628";
import { setLanguageTextWithTooltips } from "../language-tooltips.js";
import { referenceKey } from "../references.js";
import { analyzeOriginalWord, summarizeHebrewGematriaTokens, wordHasLanguageScript } from "../language.js";
import { resolveInterlinearVerseTokens } from "../strongs.js?v=interaction-qa-20260628";
import { getTokenRenderings, getWorkspaceVerse, setTokenRendering, setVerseDraft } from "../stores.js";
import { createVerseContextTabs } from "./verse-context-tabs.js?v=interaction-qa-20260628";
import { createStudyEmptyState } from "../study-empty-state.js";
import { interlinearTokenIdentity } from "../ui-contracts.js";

function normalizeWordMapSpan(raw, bsbVerseText) {
  const start = Number(raw[2] || 0);
  const end = Number(raw[3] || start);
  return {
    strong_token_index: raw[0],
    source_token_index: raw[1],
    start_offset: start,
    end_offset: end,
    strong_code: raw[4],
    language: raw[5],
    bsb_span: bsbVerseText.slice(start, end),
  };
}

function createWordMapLookup(rawSpans, bsbVerseText) {
  const spans = (rawSpans || []).map((span) => normalizeWordMapSpan(span, bsbVerseText));
  const bySource = new Map();
  const byStrong = new Map();
  spans.forEach((span) => {
    if (span.source_token_index !== null && span.source_token_index !== undefined) {
      bySource.set(Number(span.source_token_index), span);
    }
    byStrong.set(`${span.strong_token_index}:${span.strong_code}`, span);
  });
  return { bySource, byStrong, spans };
}

function wordMapForToken(token, lookup) {
  if (!lookup) return null;
  return lookup.bySource.get(Number(token.token_index)) || lookup.byStrong.get(`${token.token_index}:${token.strong_code}`) || null;
}

function tokenWordInfo(token) {
  const meaning = token.english || token.gloss || token.short_definition || "";
  return {
    meaning,
    strongCode: token.strong_code || "",
    transliteration: token.transliteration || "",
  };
}

function normalizeOriginalKey(text, language) {
  const normalized = String(text || "").normalize("NFD");
  const letterPattern = language === "greek" ? /[\u0370-\u03ff\u1f00-\u1fff]/gu : /[\u05d0-\u05ea]/gu;
  return Array.from(normalized.matchAll(letterPattern), (match) => match[0]).join("");
}

function createOriginalWordInfoLookup(tokens) {
  const lookup = new Map();
  tokens.forEach((token) => {
    if (!token.original) return;
    const info = tokenWordInfo(token);
    lookup.set(String(token.original).normalize("NFD"), info);
    lookup.set(normalizeOriginalKey(token.original, token.language), info);
  });
  return lookup;
}

function appendWorkspaceWordMap(card, token, wordMapSpan) {
  const panel = document.createElement("div");
  panel.className = wordMapSpan ? "workspace-word-map" : "workspace-word-map missing";

  const title = document.createElement("div");
  title.className = "workspace-word-map-title";
  title.textContent = "BSB word map";
  panel.append(title);

  if (!wordMapSpan) {
    const missing = document.createElement("div");
    missing.className = "workspace-map-row";
    missing.append(textNode("No BSB span mapped for this source token yet."));
    panel.append(missing);
    card.append(panel);
    return;
  }

  const rows = [
    ["BSB span", wordMapSpan.bsb_span || "(empty span)"],
    ["Offsets", `${wordMapSpan.start_offset}-${wordMapSpan.end_offset}`],
    ["Source token", `#${wordMapSpan.source_token_index || token.token_index}: ${token.original || ""}`],
    ["Strong", wordMapSpan.strong_code || token.strong_code || "No Strong's"],
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "workspace-map-row";
    const key = document.createElement("span");
    key.className = "workspace-map-key";
    key.textContent = label;
    const val = document.createElement("span");
    val.className = label === "BSB span" ? "workspace-map-value bsb-span" : "workspace-map-value";
    val.textContent = value;
    row.append(key, val);
    panel.append(row);
  });

  card.append(panel);
}

function rangesOverlap(a, b) {
  if (!a || !b) return false;
  return Number(a.start_offset) < Number(b.end) && Number(a.end_offset) > Number(b.start);
}

function createTranslationAlignmentPanel(tokens, wordMapLookup, selectedRange) {
  const panel = document.createElement("section");
  panel.className = "translation-alignment";
  const heading = document.createElement("h4");
  heading.textContent = "Word-by-word alignment";
  const intro = document.createElement("p");
  intro.textContent = "Hover a source word or BSB span to focus the paired words.";
  panel.append(heading, intro);

  const grid = document.createElement("div");
  grid.className = "translation-alignment-grid";
  tokens.forEach((token) => {
    const span = wordMapForToken(token, wordMapLookup);
    const pair = document.createElement("button");
    pair.type = "button";
    pair.className = "translation-token-pair";
    if (rangesOverlap(span, selectedRange)) pair.classList.add("selected-range");
    pair.dataset.sourceIndex = String(token.token_index ?? "");

    const source = document.createElement("span");
    source.className = token.language === "hebrew" ? "alignment-source rtl-token" : "alignment-source";
    setLanguageTextWithTooltips(source, token.original || "", token.language, { wordInfo: tokenWordInfo(token) });

    const english = document.createElement("span");
    english.className = "alignment-english";
    english.textContent = span?.bsb_span || token.english || "(unmapped)";

    const meta = document.createElement("span");
    meta.className = "alignment-meta";
    meta.textContent = [token.strong_code, token.gloss].filter(Boolean).join(" - ");

    pair.append(source, english, meta);
    grid.append(pair);
  });
  panel.append(grid);
  return panel;
}

function createVerseGematriaSummary(total, tokens) {
  const summary = document.createElement("section");
  summary.className = "verse-gematria-total";
  const label = document.createElement("span");
  label.textContent = "Verse gematria total";
  const value = document.createElement("strong");
  value.textContent = String(total);
  const count = document.createElement("small");
  count.textContent = `${tokens.length} Hebrew words`;
  summary.append(label, value, count);
  return summary;
}

async function calculateHebrewVerseGematria(tokens) {
  const hasHebrewScript = tokens.some(
    (token) =>
      token.language === "hebrew" &&
      token.original &&
      wordHasLanguageScript(token.original, "hebrew"),
  );
  if (!hasHebrewScript) return null;
  return summarizeHebrewGematriaTokens(tokens, await loadLanguageMetadata("hebrew"));
}

export function createInterlinearTranslationViews(ctx, { appendLanguageBreakdown, showStrong }) {
  let stopInterlinearLazyLoad = () => {};

  function interlinearTokensForVerse(verse) {
    return resolveInterlinearVerseTokens({
      rawInterlinearByVerse: ctx.state.interlinear?.chapters?.[ctx.state.chapter],
      rawStrongByVerse: ctx.state.strongs?.chapters?.[ctx.state.chapter],
      chapterVerses: ctx.state.verseBook?.chapters?.[ctx.state.chapter],
      targetVerse: verse,
      reference: { bookId: ctx.state.bookId, chapter: ctx.state.chapter },
    });
  }

  function interlinearVerses() {
    return Object.keys(ctx.state.verseBook?.chapters?.[ctx.state.chapter] || {})
      .filter((verse) => interlinearTokensForVerse(verse).length)
      .sort((a, b) => Number(a) - Number(b));
  }

  function createInterlinearTokenCard(token, options = {}) {
    const card = document.createElement("div");
    card.className = "interlinear-token";
    card.dataset.tokenIndex = String(token.token_index ?? "");
    card.dataset.strongCode = token.strong_code || "";
    card.dataset.verse = String(token.verse || options.verseContext?.verse || "");
    card.dataset.interlinearKey = interlinearTokenIdentity({
      verse: card.dataset.verse,
      tokenIndex: card.dataset.tokenIndex,
      strongCode: card.dataset.strongCode,
    });

    const original = document.createElement("div");
    original.className = token.language === "hebrew" ? "token-original rtl-token" : "token-original";
    setLanguageTextWithTooltips(original, token.original || "", token.language, { wordInfo: tokenWordInfo(token) });

    const transliteration = document.createElement("div");
    transliteration.className = "token-translit";
    const translitText = token.transliteration || "";
    transliteration.textContent = translitText && translitText !== (token.original || "") ? translitText : "";
    transliteration.hidden = !transliteration.textContent;

    const meta = document.createElement("div");
    meta.className = "token-meta";
    const strong = token.strong_code ? document.createElement("button") : document.createElement("span");
    strong.className = token.strong_code ? "link-button compact-link" : "";
    strong.textContent = token.strong_code || "No Strong's";
    if (token.strong_code) {
      strong.type = "button";
      strong.disabled = !ctx.canUseCapability?.("strongs-overlay");
      strong.addEventListener("click", (event) => {
        if (!ctx.canUseCapability?.("strongs-overlay")) return;
        event.stopPropagation();
        stopInterlinearLazyLoad();
        const tokenVerseContext = {
          ...options.verseContext,
          verse: card.dataset.verse,
          reference: ctx.currentReference(card.dataset.verse),
        };
        ctx.highlightReaderContext?.({
          verse: tokenVerseContext.verse,
          word: {
            tokenIndex: token.token_index,
            strongCode: token.strong_code,
            language: token.language,
            original: token.original,
          },
          commit: true,
        });
        showStrong(token, { pin: true, verseContext: tokenVerseContext });
      });
    }
    meta.append(strong, textNode(token.morphology ? ` / ${token.morphology}` : ""));

    const english = document.createElement("div");
    english.className = "token-english";
    english.textContent = token.english || "";

    const gloss = document.createElement("div");
    gloss.className = "token-gloss";
    gloss.textContent = token.gloss || "";

    card.append(original, transliteration, meta, english, gloss);
    appendLanguageBreakdown(card, token);

    if (options.workspace && options.referenceKey) {
      if (options.wordMapLookup) appendWorkspaceWordMap(card, token, wordMapForToken(token, options.wordMapLookup));

      const renderings = getTokenRenderings(ctx.state, options.referenceKey);
      const label = document.createElement("label");
      label.className = "token-rendering";
      const labelText = document.createElement("span");
      labelText.textContent = "Your rendering";
      const input = document.createElement("input");
      input.value = renderings[token.token_index]?.rendering || "";
      input.addEventListener("change", () => {
        setTokenRendering(ctx.state, options.referenceKey, token, input.value.trim());
      });
      label.append(labelText, input);
      card.append(label);
    }

    return card;
  }

  async function createInterlinearVerseSection(verse) {
    const reference = ctx.currentReference(verse);
    const tokens = interlinearTokensForVerse(verse);
    if (!tokens.length) return null;

    const section = document.createElement("section");
    section.className = "interlinear-verse-section";
    section.dataset.verse = String(verse);
    const heading = document.createElement("h3");
    heading.textContent = reference;
    const key = referenceKey(ctx.state.bookId, ctx.state.chapter, verse);
    const verseContext = { reference, verse };
    const wordInfoLookup = createOriginalWordInfoLookup(tokens);
    section.append(heading);

    const sourceTexts = await loadOriginalSourceTexts(ctx.state, tokens[0].language, verse);
    if (sourceTexts.length) {
      const sourceList = document.createElement("div");
      sourceList.className = "source-text-list";
      sourceTexts.forEach((source) => {
        const item = document.createElement("div");
        const label = document.createElement("div");
        label.className = "reference-label";
        label.textContent = source.label;
        const text = document.createElement("div");
        text.className = source.id === "wlc" || source.id === "wlco" ? "source-text rtl-text" : "source-text";
        setLanguageTextWithTooltips(text, source.text, tokens[0].language, { wordInfoLookup });
        item.append(label, text);
        sourceList.append(item);
      });
      section.append(sourceList);
    }

    const tokenList = document.createElement("div");
    tokenList.className = "interlinear-token-list";
    tokens.forEach((token) => {
      tokenList.append(
        createInterlinearTokenCard(token, {
          workspace: false,
          referenceKey: key,
          verseContext,
        }),
      );
    });
    section.append(tokenList);
    const verseGematria = await calculateHebrewVerseGematria(tokens);
    if (verseGematria) section.append(createVerseGematriaSummary(verseGematria.total, verseGematria.tokens));
    return section;
  }

  async function showInterlinearVerse(reference, verse, options = {}) {
    stopInterlinearLazyLoad();
    if (!ctx.canUseCapability?.("interlinear")) {
      setDetail(
        "Interlinear",
        createStudyEmptyState(ctx, "interlinear", {
          reference,
          capabilityIds: ["interlinear"],
        }),
        options,
      );
      return;
    }
    const initialSection = await createInterlinearVerseSection(verse);
    if (!initialSection) {
      const empty = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = reference;
      const message = document.createElement("p");
      message.textContent = `No interlinear data found for ${reference}.`;
      empty.append(heading, createVerseContextTabs(ctx, reference, verse, "interlinear", ctx.studyContext?.strong), message);
      setDetail("Interlinear", empty, options);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "interlinear-lazy-reader";
    wrap.append(createVerseContextTabs(ctx, reference, verse, "interlinear", ctx.studyContext?.strong), initialSection);
    const status = document.createElement("p");
    status.className = "interlinear-lazy-status";
    status.setAttribute("role", "status");
    wrap.append(status);
    setDetail("Interlinear", wrap, options);

    const verses = interlinearVerses();
    let currentIndex = verses.indexOf(String(verse));
    let loading = false;
    const pane = els.detailPane;
    const updateStatus = () => {
      const nextVerse = verses[currentIndex + 1];
      status.textContent = nextVerse ? `Scroll to load ${ctx.currentReference(nextVerse)}.` : "End of chapter.";
    };
    const stop = () => {
      pane?.removeEventListener("scroll", onScroll);
      if (stopInterlinearLazyLoad === stop) stopInterlinearLazyLoad = () => {};
    };
    const loadNext = async () => {
      if (loading || !wrap.isConnected) {
        if (!wrap.isConnected) stop();
        return;
      }
      const nextVerse = verses[currentIndex + 1];
      if (!nextVerse) {
        updateStatus();
        stop();
        return;
      }
      loading = true;
      status.textContent = `Loading ${ctx.currentReference(nextVerse)}…`;
      const section = await createInterlinearVerseSection(nextVerse);
      if (section && wrap.isConnected) {
        wrap.insertBefore(section, status);
        currentIndex += 1;
      }
      loading = false;
      updateStatus();
      if (nearBottom()) window.requestAnimationFrame(maybeLoadNext);
    };
    const nearBottom = () =>
      pane && pane.scrollHeight - pane.scrollTop - pane.clientHeight <= 160;
    const maybeLoadNext = () => {
      if (nearBottom()) void loadNext();
    };
    function onScroll() {
      maybeLoadNext();
    }
    stopInterlinearLazyLoad = stop;
    pane?.addEventListener("scroll", onScroll, { passive: true });
    updateStatus();
    window.requestAnimationFrame(maybeLoadNext);
  }

  function showInterlinearChapter() {
    stopInterlinearLazyLoad();
    if (!ctx.canUseCapability?.("interlinear")) {
      setDetail(
        "Interlinear",
        createStudyEmptyState(ctx, "interlinear", {
          capabilityIds: ["interlinear"],
        }),
      );
      return;
    }
    const verses = interlinearVerses();
    if (!verses.length) {
      setDetailMessage("Interlinear", "No interlinear data found for this chapter.");
      return;
    }

    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = `${ctx.state.verseBook?.book?.name || ctx.state.bookId} ${ctx.state.chapter} Interlinear`;
    const intro = document.createElement("p");
    intro.textContent =
      "Choose a verse to inspect source text, Strong's numbers, morphology, glosses, and token renderings.";
    wrap.append(heading, intro);
    wrap.append(
      createDetailList(verses, (li, verse) => {
        const reference = ctx.currentReference(verse);
        li.append(ctx.createReferenceButton(reference, { book_id: ctx.state.bookId, chapter: ctx.state.chapter, verse_start: verse }));
        const inspect = document.createElement("button");
        inspect.type = "button";
        inspect.className = "mini-button";
        inspect.textContent = "Inspect";
        inspect.addEventListener("click", () => void showInterlinearVerse(reference, verse));
        li.append(inspect);
      }),
    );
    setDetail("Interlinear", wrap);
  }

  function showTranslationWorkspaceIndex() {
    stopInterlinearLazyLoad();
    const verses = Object.keys(ctx.state.verseBook?.chapters?.[ctx.state.chapter] || {}).sort(
      (a, b) => Number(a) - Number(b),
    );
    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = `${ctx.state.verseBook?.book?.name || ctx.state.bookId} ${ctx.state.chapter} Translation Workspace`;
    wrap.append(heading);
    if (!ctx.canUseCapability?.("interlinear")) {
      wrap.append(
        createStudyEmptyState(ctx, "translation", {
          capabilityIds: ["interlinear"],
        }),
      );
    }
    wrap.append(
      createDetailList(verses, (li, verse) => {
        const key = referenceKey(ctx.state.bookId, ctx.state.chapter, verse);
        const draft = getWorkspaceVerse(ctx.state, key);
        const label = draft?.draft_text ? `${ctx.currentReference(verse)} - draft saved` : ctx.currentReference(verse);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "link-button";
        button.textContent = label;
        button.addEventListener("click", () => void showTranslationVerseWorkspace(verse));
        li.append(button);
      }),
    );
    setDetail("Translation", wrap);
  }

  async function showTranslationVerseWorkspace(verse, options = {}) {
    stopInterlinearLazyLoad();
    const key = referenceKey(ctx.state.bookId, ctx.state.chapter, verse);
    const reference = ctx.currentReference(verse);
    const interlinearAvailable = ctx.canUseCapability?.("interlinear");
    const tokens = interlinearAvailable
      ? resolveInterlinearVerseTokens({
          rawInterlinearByVerse: ctx.state.interlinear?.chapters?.[ctx.state.chapter],
          rawStrongByVerse: ctx.state.strongs?.chapters?.[ctx.state.chapter],
          chapterVerses: ctx.state.verseBook?.chapters?.[ctx.state.chapter],
          targetVerse: verse,
          reference: { bookId: ctx.state.bookId, chapter: ctx.state.chapter },
        })
      : [];
    const draft = getWorkspaceVerse(ctx.state, key);
    const canonical = ctx.state.verseBook?.chapters?.[ctx.state.chapter]?.[verse] || "";
    const [wordMapBook, bsbBook] = await Promise.all([
      fetchWordMapBook("bsb", ctx.state.bookId).catch(() => null),
      fetchVerseBook("bsb", ctx.state.bookId),
    ]);
    const bsbVerseText = bsbBook?.chapters?.[ctx.state.chapter]?.[verse] || canonical;
    const wordMapLookup = createWordMapLookup(wordMapBook?.chapters?.[ctx.state.chapter]?.[verse] || [], bsbVerseText);

    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = reference;

    const source = document.createElement("p");
    source.className = "workspace-source";
    source.textContent = canonical;
    const bsbSource = document.createElement("p");
    bsbSource.className = "workspace-source bsb-workspace-source";
    bsbSource.textContent = `BSB: ${bsbVerseText}`;

    const label = document.createElement("label");
    label.className = "workspace-draft";
    const labelText = document.createElement("span");
    labelText.textContent = "Your translation";
    const textarea = document.createElement("textarea");
    textarea.rows = 5;
    textarea.value = draft?.draft_text || "";
    textarea.dataset.revision = String(draft?.revision || 0);
    textarea.placeholder = "Draft your translation here.";
    const conflictStatus = document.createElement("p");
    conflictStatus.className = "import-status error";
    conflictStatus.hidden = true;
    textarea.addEventListener("change", () => {
      const result = setVerseDraft(ctx.state, key, textarea.value.trim(), {
        expected_revision: Number(textarea.dataset.revision || 0),
      });
      if (result?.conflict) {
        conflictStatus.hidden = false;
        conflictStatus.textContent =
          "This draft changed in another tab. Reload the verse workspace before applying your edit.";
        return;
      }
      textarea.dataset.revision = String(result?.revision || Number(textarea.dataset.revision || 0) + 1);
      conflictStatus.hidden = true;
    });
    label.append(labelText, textarea);

    wrap.append(heading, source);
    if (bsbVerseText && bsbVerseText !== canonical) wrap.append(bsbSource);
    if (tokens.length) {
      wrap.append(createTranslationAlignmentPanel(tokens, wordMapLookup, options.selectedRange));
    }
    wrap.append(label, conflictStatus);

    if (!tokens.length) {
      wrap.append(
        createStudyEmptyState(ctx, interlinearAvailable ? "interlinear" : "translation", {
          reference,
          capabilityIds: ["interlinear"],
        }),
      );
    } else {
      const tokenHeading = document.createElement("h4");
      tokenHeading.textContent = `${tokens[0]?.language === "greek" ? "Greek" : "Hebrew"} word renderings`;
      const tokenList = document.createElement("div");
      tokenList.className = "interlinear-token-list";
      tokens.forEach((token) => {
        tokenList.append(createInterlinearTokenCard(token, { workspace: true, referenceKey: key, wordMapLookup }));
      });
      wrap.append(tokenHeading, tokenList);
    }

    setDetail("Translation", wrap);
  }

  return {
    showInterlinearChapter,
    showInterlinearVerse,
    showTranslationVerseWorkspace,
    showTranslationWorkspaceIndex,
  };
}
