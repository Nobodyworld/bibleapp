import { loadLanguageMetadata } from "./data-service.js?v=original-language-sources-20260710b";
import { analyzeOriginalWord, gematriaValueForUnit, wordHasLanguageScript } from "./language.js";

const HEBREW_RUN = /[\u0591-\u05c7\u05d0-\u05ea]+/gu;
const GREEK_RUN = /[\u0300-\u036f\u0370-\u03ff\u1f00-\u1fff]+/gu;
const TRANSLITERATION_SYMBOLS = new Map([
  ["ā", "a with macron as written in the bundled transliteration"],
  ["ē", "e with macron as written in the bundled transliteration"],
  ["ī", "i with macron as written in the bundled transliteration"],
  ["ō", "o with macron as written in the bundled transliteration"],
  ["ū", "u with macron as written in the bundled transliteration"],
  ["â", "a with circumflex as written in the bundled transliteration"],
  ["ê", "e with circumflex as written in the bundled transliteration"],
  ["î", "i with circumflex as written in the bundled transliteration"],
  ["ô", "o with circumflex as written in the bundled transliteration"],
  ["û", "u with circumflex as written in the bundled transliteration"],
  ["ḥ", "h with dot below as written in the bundled transliteration"],
  ["ṣ", "s with dot below as written in the bundled transliteration"],
  ["ṭ", "t with dot below as written in the bundled transliteration"],
  ["ḏ", "d with line below as written in the bundled transliteration"],
  ["ḵ", "k with line below as written in the bundled transliteration"],
  ["ṯ", "t with line below as written in the bundled transliteration"],
  ["š", "s with caron as written in the bundled transliteration"],
  ["ś", "s with acute accent as written in the bundled transliteration"],
  ["‘", "consonant marker as written in the bundled transliteration"],
  ["’", "consonant marker as written in the bundled transliteration"],
  ["ʿ", "consonant marker as written in the bundled transliteration"],
  ["·", "middle dot separating transliterated word parts"],
]);
let tooltipLayer = null;
let activeTooltipTarget = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function tooltipTarget(node) {
  return node?.closest?.(
    ".language-letter-hover[data-tooltip], .letter-unit[data-tooltip], .transliteration-symbol[data-tooltip]",
  ) || null;
}

function ensureTooltipLayer() {
  if (typeof document === "undefined") return null;
  if (tooltipLayer) return tooltipLayer;

  tooltipLayer = document.createElement("div");
  tooltipLayer.className = "language-tooltip-layer";
  tooltipLayer.setAttribute("role", "tooltip");
  tooltipLayer.hidden = true;
  document.body.append(tooltipLayer);

  function hideTooltip() {
    activeTooltipTarget = null;
    tooltipLayer.hidden = true;
    tooltipLayer.textContent = "";
  }

  function positionTooltip(target) {
    if (!target || tooltipLayer.hidden) return;
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltipLayer.getBoundingClientRect();
    const margin = 10;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const centerX = rect.left + rect.width / 2;
    const above = rect.top - tooltipRect.height - margin;
    const below = rect.bottom + margin;
    const top = above >= margin ? above : Math.min(below, viewportHeight - tooltipRect.height - margin);
    tooltipLayer.style.left = `${clamp(centerX - tooltipRect.width / 2, margin, viewportWidth - tooltipRect.width - margin)}px`;
    tooltipLayer.style.top = `${clamp(top, margin, viewportHeight - tooltipRect.height - margin)}px`;
  }

  function showTooltip(target) {
    const text = target?.dataset?.tooltip;
    if (!text) {
      hideTooltip();
      return;
    }
    activeTooltipTarget = target;
    tooltipLayer.textContent = text;
    tooltipLayer.hidden = false;
    tooltipLayer.style.left = "0px";
    tooltipLayer.style.top = "0px";
    positionTooltip(target);
  }

  document.addEventListener("pointerover", (event) => {
    const target = tooltipTarget(event.target);
    if (target) showTooltip(target);
  });
  document.addEventListener("mouseover", (event) => {
    const target = tooltipTarget(event.target);
    if (target) showTooltip(target);
  });
  document.addEventListener("pointermove", (event) => {
    const target = tooltipTarget(event.target) || activeTooltipTarget;
    if (target === activeTooltipTarget) positionTooltip(target);
  });
  document.addEventListener("mousemove", (event) => {
    const target = tooltipTarget(event.target) || activeTooltipTarget;
    if (target === activeTooltipTarget) positionTooltip(target);
  });
  document.addEventListener("pointerout", (event) => {
    if (!activeTooltipTarget) return;
    const next = event.relatedTarget;
    if (!next || !activeTooltipTarget.contains(next)) hideTooltip();
  });
  document.addEventListener("mouseout", (event) => {
    if (!activeTooltipTarget) return;
    const next = event.relatedTarget;
    if (!next || !activeTooltipTarget.contains(next)) hideTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const target = tooltipTarget(event.target);
    if (target) showTooltip(target);
  });
  document.addEventListener("focusout", (event) => {
    if (activeTooltipTarget && event.target === activeTooltipTarget) hideTooltip();
  });
  window.addEventListener("scroll", () => positionTooltip(activeTooltipTarget), true);
  window.addEventListener("resize", () => positionTooltip(activeTooltipTarget));

  return tooltipLayer;
}

function displayMarkChar(record) {
  const char = record.mark?.char || record.char || "";
  return char.match(/\p{Mark}/u) ? `\u25CC${char}` : char;
}

export function languageUnitText(unit) {
  const markChars = (unit.marks || []).map((record) => record.char || "");
  const text = unit.standalone && markChars[0] === unit.char
    ? markChars.join("")
    : `${unit.char || ""}${markChars.join("")}`;
  return text.normalize("NFC");
}

export function transliterationSymbolDescription(character, sourceLabel = "Bundled Strong's/interlinear transliteration") {
  const description = TRANSLITERATION_SYMBOLS.get(character);
  if (!description) return "";
  return `${character}: ${description}. ${sourceLabel} is scholarly transliteration, not exact pronunciation.`;
}

export function setTransliterationTextWithTooltips(node, text, options = {}) {
  const source = String(text || "");
  const sourceLabel = options.sourceLabel || "Bundled Strong's/interlinear transliteration";
  node.dataset.transliterationConvention = "bundled-strongs-interlinear";
  node.setAttribute(
    "aria-description",
    `${sourceLabel}. Scholarly transliteration is kept separate from phonetic spelling and is not exact pronunciation.`,
  );
  node.title = `${sourceLabel}; scholarly transliteration, not exact pronunciation.`;
  node.replaceChildren();
  ensureTooltipLayer();
  for (const character of source) {
    const description = transliterationSymbolDescription(character, sourceLabel);
    if (!description) {
      node.append(document.createTextNode(character));
      continue;
    }
    const symbol = document.createElement("span");
    symbol.className = "transliteration-symbol";
    symbol.textContent = character;
    symbol.dataset.tooltip = description;
    symbol.setAttribute("aria-label", description);
    symbol.tabIndex = 0;
    node.append(symbol);
  }
  return Boolean(source);
}

function wordInfoText(wordInfo) {
  if (!wordInfo) return "";
  if (typeof wordInfo === "string") return wordInfo;
  return [wordInfo.meaning, wordInfo.strongCode, wordInfo.transliteration].filter(Boolean).join(" - ");
}

export function languageUnitTooltip(unit, language, options = {}) {
  ensureTooltipLayer();
  const letter = unit.letter;
  const letterName = letter?.name || unit.marks?.[0]?.mark?.name || unit.code_point;
  const sound = letter?.transliteration || letter?.sound || "";
  const value = language === "hebrew" ? gematriaValueForUnit(unit) : 0;
  const glyph = languageUnitText(unit);
  const context = wordInfoText(options.wordInfo);
  const parts = [];
  if (context) parts.push(`word: ${context}`, "");
  parts.push(`${glyph}  ${letterName}`);
  if (sound) parts.push(`sound: ${sound}`);
  if (value) parts.push(`gematria: ${value}`);

  const markText = (unit.marks || [])
    .map((record) => {
      const mark = record.mark;
      return [displayMarkChar(record), mark?.short_label || mark?.name || record.code_point].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(", ");
  if (markText) parts.push(`marks: ${markText}`);
  return parts.join("\n");
}

function normalizeLookupKey(text, language) {
  const normalized = String(text || "").normalize("NFD");
  const letterPattern = language === "greek" ? /[\u0370-\u03ff\u1f00-\u1fff]/gu : /[\u05d0-\u05ea]/gu;
  return Array.from(normalized.matchAll(letterPattern), (match) => match[0]).join("");
}

function lookupWordInfo(text, language, options) {
  if (options.wordInfo) return options.wordInfo;
  const lookup = options.wordInfoLookup;
  if (!lookup) return null;
  const exact = String(text || "").normalize("NFD");
  return lookup.get(exact) || lookup.get(normalizeLookupKey(text, language)) || null;
}

function renderAnalyzedRun(text, language, metadata, options = {}) {
  const word = document.createElement("span");
  word.className = `language-word-hover ${language}`;
  ensureTooltipLayer();
  const analysis = analyzeOriginalWord(text, language, metadata);
  const wordInfo = lookupWordInfo(text, language, options);
  analysis.units.forEach((unit) => {
    const span = document.createElement("span");
    span.className = unit.standalone ? "language-letter-hover mark-hover" : "language-letter-hover";
    span.textContent = languageUnitText(unit);
    span.dataset.tooltip = languageUnitTooltip(unit, language, { wordInfo });
    span.setAttribute("aria-label", span.dataset.tooltip);
    span.tabIndex = 0;
    word.append(span);
  });
  return word;
}

export function initializeLanguageTooltips() {
  ensureTooltipLayer();
}

export function renderLanguageTextWithTooltips(text, language, metadata, options = {}) {
  const source = String(text || "");
  const pattern = language === "greek" ? GREEK_RUN : HEBREW_RUN;
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    const index = match.index || 0;
    if (index > cursor) fragment.append(document.createTextNode(source.slice(cursor, index)));
    fragment.append(renderAnalyzedRun(match[0], language, metadata, options));
    cursor = index + match[0].length;
  }

  if (cursor < source.length) fragment.append(document.createTextNode(source.slice(cursor)));
  return fragment;
}

export function setLanguageTextWithTooltips(node, text, language, options = {}) {
  const source = String(text || "");
  node.textContent = source;
  if ((language !== "hebrew" && language !== "greek") || !wordHasLanguageScript(source, language)) return false;

  loadLanguageMetadata(language)
    .then((metadata) => {
      if (!metadata) return;
      node.replaceChildren(renderLanguageTextWithTooltips(source, language, metadata, options));
    })
    .catch(() => {
      node.textContent = source;
    });
  return true;
}
