import { fetchLexiconEntry } from "./data-service.js?v=pr13-live-qa-20260711e";

export function compactStrongDefinition(entry) {
  return (
    entry?.short_definition ||
    entry?.meaning ||
    entry?.concordance_definition ||
    String(entry?.strongs_concordance || "").split("\n").map((line) => line.trim()).find(Boolean) ||
    ""
  );
}

export function strongReferencePreview(entry, ref, label) {
  if (!entry) return `${label}${ref?.strong_code ? ` (${ref.strong_code})` : ""}`;
  const original = entry.original_word || label;
  const transliteration = entry.transliteration && entry.transliteration !== original ? entry.transliteration : "";
  const language = entry.language === "hebrew" ? "Hebrew" : entry.language === "greek" ? "Greek" : "";
  return [original, transliteration, ref?.strong_code, language, compactStrongDefinition(entry)].filter(Boolean).join(" · ");
}

function refreshVisibleTooltip(button) {
  if (!button.isConnected) return;
  if (!button.matches(":hover") && document.activeElement !== button) return;
  button.dispatchEvent(new Event("pointerover", { bubbles: true }));
}

export function createStrongReferenceControl(ref, { label = ref?.label || ref?.strong_code || "Strong's", onActivate } = {}) {
  const code = /^[HG]\d+$/u.test(String(ref?.strong_code || "").toUpperCase())
    ? String(ref.strong_code).toUpperCase()
    : "";
  if (!code) return null;
  const item = { ...ref, strong_code: code };
  const button = document.createElement("button");
  button.type = "button";
  button.className = "strong-inline-link definition-tooltip";
  button.textContent = label;
  button.dataset.tooltip = `${label} (${code}) — Loading definition…`;
  button.setAttribute("aria-label", `Open Strong's ${label}, ${code}`);
  let hydration;
  const hydrate = () => {
    if (!hydration) {
      hydration = fetchLexiconEntry(code).catch(() => null).then((entry) => {
        button.dataset.tooltip = strongReferencePreview(entry, item, label);
        button.dataset.previewReady = "true";
        refreshVisibleTooltip(button);
        return entry;
      });
    }
    return hydration;
  };
  button.addEventListener("pointerenter", hydrate);
  button.addEventListener("focus", hydrate);
  button.addEventListener("pointerdown", hydrate);
  button.addEventListener("click", () => onActivate?.(item));
  return button;
}

export function resolveStrongSeeSegments(text, refs = []) {
  const value = String(text || "");
  const segments = [];
  const pattern = /see (GREEK|HEBREW) ([^\n]+)/gu;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) segments.push({ text: value.slice(cursor, match.index) });
    const language = match[1].toLowerCase();
    const label = match[2].trim();
    const ref = refs.find((item) => item.language === language && String(item.label || "").trim() === label) || null;
    segments.push({ text: `see ${match[1]} `, label, language, ref });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor) });
  return segments;
}
