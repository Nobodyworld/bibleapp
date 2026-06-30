import { testamentForBook } from "./reference-context.js";

export const TARGET_SCHEMA_VERSION = 2;

export const TAG_TARGET_TYPES = Object.freeze([
  "book",
  "chapter",
  "verse",
  "verse_range",
  "text_span",
  "source_token",
  "source_token_span",
]);

const CANONICAL_TAG_IDS = Object.freeze({
  positive_sentiment: "tag:positive-sentiment",
  negative_sentiment: "tag:negative-sentiment",
  command_declaration: "tag:command-declaration",
  question: "tag:question",
  inquiry: "tag:inquiry",
  favorite: "tag:favorite",
});

const LEGACY_TAG_IDS = Object.freeze(
  Object.fromEntries(Object.entries(CANONICAL_TAG_IDS).map(([legacyId, canonicalId]) => [canonicalId, legacyId])),
);

function normalizedId(value) {
  return String(value || "").trim().toLowerCase() || null;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function translationId(input, fallback = "bsb") {
  return normalizedId(input?.translation_id || input?.translationId || input?.edition_id || fallback);
}

function referenceInput(input = {}) {
  return input.reference && typeof input.reference === "object" ? input.reference : input;
}

function baseTarget(targetType, input = {}, fallbackTranslation = "bsb") {
  const ref = referenceInput(input);
  const bookId = normalizedId(ref.book_id || ref.bookId);
  const testament = testamentForBook(bookId);
  const translation = translationId(input, fallbackTranslation);
  if (!bookId || !testament || !translation) return null;
  return {
    schema_version: TARGET_SCHEMA_VERSION,
    target_type: targetType,
    target_id: null,
    translation_id: translation,
    edition_id: translation,
    testament,
    reference: { book_id: bookId },
  };
}

function finalizeTarget(target) {
  if (!target) return null;
  const id = targetId(target);
  return id ? { ...target, target_id: id } : null;
}

function verseInput(keyOrInput, fallbackTranslation = "bsb") {
  if (typeof keyOrInput === "string") {
    const parsed = parseReferenceKey(keyOrInput);
    return {
      translation_id: fallbackTranslation,
      reference: {
        book_id: parsed.book_id,
        chapter: parsed.chapter,
        verse_start: parsed.verse,
        verse_end: parsed.verse,
      },
    };
  }
  return keyOrInput || {};
}

export function tagDefinitionId(tagId) {
  const raw = String(tagId || "").trim();
  if (!raw) return "";
  if (raw.startsWith("tag:")) return CANONICAL_TAG_IDS[raw.slice(4)] || raw;
  return CANONICAL_TAG_IDS[raw] || `tag:${raw}`;
}

export function legacyTagId(tagId) {
  const canonical = tagDefinitionId(tagId);
  return LEGACY_TAG_IDS[canonical] || canonical.replace(/^tag:/, "");
}

export function parseReferenceKey(key) {
  const [bookId, chapter, verse] = String(key || "").split(":");
  return {
    book_id: normalizedId(bookId),
    chapter: positiveInteger(chapter),
    verse: positiveInteger(verse),
  };
}

export function referenceKeyFromTarget(target) {
  const ref = target?.reference || {};
  if (!ref.book_id || !positiveInteger(ref.chapter) || !positiveInteger(ref.verse_start)) return null;
  return `${normalizedId(ref.book_id)}:${positiveInteger(ref.chapter)}:${positiveInteger(ref.verse_start)}`;
}

export function createBookTarget(bookOrContext, fallbackTranslation = "bsb") {
  const input = typeof bookOrContext === "string" ? { book_id: bookOrContext } : bookOrContext || {};
  return finalizeTarget(baseTarget("book", input, fallbackTranslation));
}

export function createChapterTarget(bookOrContext, chapter, fallbackTranslation = "bsb") {
  const input =
    typeof bookOrContext === "string"
      ? { translation_id: fallbackTranslation, book_id: bookOrContext, chapter }
      : bookOrContext || {};
  const target = baseTarget("chapter", input, fallbackTranslation);
  const chapterNumber = positiveInteger(referenceInput(input).chapter);
  if (!target || !chapterNumber) return null;
  target.reference.chapter = chapterNumber;
  return finalizeTarget(target);
}

export function createVerseTarget(keyOrContext, fallbackTranslation = "bsb") {
  const input = verseInput(keyOrContext, fallbackTranslation);
  const ref = referenceInput(input);
  const target = baseTarget("verse", input, fallbackTranslation);
  const chapter = positiveInteger(ref.chapter);
  const verse = positiveInteger(ref.verse_start || ref.verse);
  if (!target || !chapter || !verse) return null;
  target.reference.chapter = chapter;
  target.reference.verse_start = verse;
  target.reference.verse_end = verse;
  return finalizeTarget(target);
}

export function createVerseRangeTarget(keyOrContext, verseEnd, fallbackTranslation = "bsb") {
  const input = verseInput(keyOrContext, fallbackTranslation);
  const ref = referenceInput(input);
  const target = baseTarget("verse_range", input, fallbackTranslation);
  const chapter = positiveInteger(ref.chapter);
  const start = positiveInteger(ref.verse_start || ref.verse);
  const end = positiveInteger(verseEnd || ref.verse_end || start);
  if (!target || !chapter || !start || !end || end < start) return null;
  target.reference.chapter = chapter;
  target.reference.verse_start = start;
  target.reference.verse_end = end;
  return finalizeTarget(target);
}

export function createTextSpanTarget(keyOrContext, anchor, fallbackTranslation = "bsb") {
  const verse = createVerseTarget(keyOrContext, fallbackTranslation);
  const charStart = nonNegativeInteger(anchor?.char_start);
  const charEnd = nonNegativeInteger(anchor?.char_end);
  const snapshot = typeof anchor?.text_snapshot === "string" ? anchor.text_snapshot : null;
  if (!verse || charStart === null || charEnd === null || charEnd <= charStart || snapshot === null) return null;
  return finalizeTarget({
    ...verse,
    target_type: "text_span",
    target_id: null,
    anchor: {
      ...anchor,
      char_start: charStart,
      char_end: charEnd,
      text_snapshot: snapshot,
    },
  });
}

export function createSourceTokenTarget(keyOrContext, token = {}, fallbackTranslation = "bsb") {
  const verse = createVerseTarget(keyOrContext, fallbackTranslation);
  const tokenIndex = positiveInteger(token.token_index ?? token.tokenIndex);
  if (!verse || !tokenIndex) return null;
  return finalizeTarget({
    ...verse,
    target_type: "source_token",
    target_id: null,
    token: {
      token_index: tokenIndex,
      strong_code: String(token.strong_code || token.strongCode || "").trim().toUpperCase() || null,
      language: normalizedId(token.language),
      original: String(token.original || "") || null,
    },
  });
}

export function createSourceTokenSpanTarget(keyOrContext, tokenSpan = {}, fallbackTranslation = "bsb") {
  const verse = createVerseTarget(keyOrContext, fallbackTranslation);
  const start = positiveInteger(tokenSpan.token_start ?? tokenSpan.tokenStart);
  const end = positiveInteger(tokenSpan.token_end ?? tokenSpan.tokenEnd);
  if (!verse || !start || !end || end < start) return null;
  const snapshots = Array.isArray(tokenSpan.source_snapshots)
    ? tokenSpan.source_snapshots.map((value) => String(value))
    : [];
  if (snapshots.length && snapshots.length !== end - start + 1) return null;
  return finalizeTarget({
    ...verse,
    target_type: "source_token_span",
    target_id: null,
    token_span: {
      token_start: start,
      token_end: end,
      source_snapshots: snapshots,
      language: normalizedId(tokenSpan.language),
      strong_codes: Array.isArray(tokenSpan.strong_codes)
        ? tokenSpan.strong_codes.map((value) => String(value).trim().toUpperCase()).filter(Boolean)
        : [],
    },
  });
}

export function normalizeTarget(target) {
  if (!target || typeof target !== "object") return null;
  const translation = translationId(target);
  if (target.target_type === "book") return createBookTarget(target, translation);
  if (target.target_type === "chapter") return createChapterTarget(target, undefined, translation);
  if (target.target_type === "verse") return createVerseTarget(target, translation);
  if (target.target_type === "verse_range") return createVerseRangeTarget(target, undefined, translation);
  if (target.target_type === "text_span") return createTextSpanTarget(target, target.anchor, translation);
  if (target.target_type === "source_token") {
    return createSourceTokenTarget(target, target.token || target.source_token || target.word, translation);
  }
  if (target.target_type === "source_token_span") {
    return createSourceTokenSpanTarget(target, target.token_span || target.source_token_span, translation);
  }
  return null;
}

export function targetId(target) {
  if (!target || !TAG_TARGET_TYPES.includes(target.target_type)) return null;
  const ref = target.reference || {};
  const translation = translationId(target, "");
  const testament = target.testament || testamentForBook(ref.book_id);
  const book = normalizedId(ref.book_id);
  if (!translation || !testament || !book) return null;
  const base = ["target", target.target_type, translation, testament, book];
  if (target.target_type === "book") return base.join(":");
  const chapter = positiveInteger(ref.chapter);
  if (!chapter) return null;
  base.push(String(chapter));
  if (target.target_type === "chapter") return base.join(":");
  const start = positiveInteger(ref.verse_start);
  if (!start) return null;
  base.push(String(start));
  if (target.target_type === "verse") return base.join(":");
  if (target.target_type === "verse_range") {
    const end = positiveInteger(ref.verse_end);
    return end && end >= start ? [...base, String(end)].join(":") : null;
  }
  if (target.target_type === "text_span") {
    const charStart = nonNegativeInteger(target.anchor?.char_start);
    const charEnd = nonNegativeInteger(target.anchor?.char_end);
    return charStart !== null && charEnd !== null && charEnd > charStart
      ? [...base, String(charStart), String(charEnd)].join(":")
      : null;
  }
  if (target.target_type === "source_token") {
    const tokenIndex = positiveInteger(target.token?.token_index);
    return tokenIndex ? [...base, String(tokenIndex)].join(":") : null;
  }
  const tokenStart = positiveInteger(target.token_span?.token_start);
  const tokenEnd = positiveInteger(target.token_span?.token_end);
  return tokenStart && tokenEnd && tokenEnd >= tokenStart
    ? [...base, String(tokenStart), String(tokenEnd)].join(":")
    : null;
}

export function getTextSpanDriftStatus(target, currentText) {
  if (target?.target_type !== "text_span" || !target.anchor) return "not_text_span";
  const { char_start: charStart, char_end: charEnd, text_snapshot: snapshot } = target.anchor;
  if (!Number.isInteger(charStart) || !Number.isInteger(charEnd) || charEnd <= charStart) return "invalid_anchor";
  if (typeof currentText !== "string" || charEnd > currentText.length) return "out_of_bounds";
  return currentText.slice(charStart, charEnd) === snapshot ? "current" : "drifted";
}

export function resolveTextSpanAnchor(target, currentText) {
  const status = getTextSpanDriftStatus(target, currentText);
  const anchor = target?.anchor || {};
  const snapshot = typeof anchor.text_snapshot === "string" ? anchor.text_snapshot : "";
  if (status === "current") {
    return {
      status,
      char_start: anchor.char_start,
      char_end: anchor.char_end,
      text_snapshot: snapshot,
    };
  }
  if (!snapshot || typeof currentText !== "string") return { status, text_snapshot: snapshot };

  const matches = [];
  let index = currentText.indexOf(snapshot);
  while (index >= 0 && matches.length < 2) {
    matches.push(index);
    index = currentText.indexOf(snapshot, index + 1);
  }
  if (matches.length !== 1) {
    return {
      status: matches.length > 1 ? "ambiguous" : status === "out_of_bounds" ? "out_of_bounds" : "unresolved",
      text_snapshot: snapshot,
    };
  }
  return {
    status: "relocated",
    char_start: matches[0],
    char_end: matches[0] + snapshot.length,
    text_snapshot: snapshot,
  };
}

export function tagAssertionId(targetOrKey, tagId, options = {}) {
  const target =
    typeof targetOrKey === "string"
      ? createVerseTarget(targetOrKey, options.translation_id || options.edition_id || "bsb")
      : normalizeTarget(targetOrKey);
  const id = targetId(target);
  const canonicalTagId = tagDefinitionId(tagId);
  if (!id || !canonicalTagId) return "";
  return `assertion:tag:${id.slice("target:".length).replaceAll(":", ".")}:${canonicalTagId.slice(4)}`;
}

export function createTagAssertion(targetOrKey, tagId, options = {}) {
  const timestamp = options.timestamp || new Date().toISOString();
  const active = options.active !== false;
  const target = normalizeTarget(
    options.target ||
      (typeof targetOrKey === "string"
        ? createVerseTarget(targetOrKey, options.translation_id || options.edition_id || "bsb")
        : targetOrKey),
  );
  if (!target) throw new Error("A complete supported tag target is required.");
  const canonicalTagId = tagDefinitionId(tagId);
  if (!canonicalTagId) throw new Error("A tag ID is required.");
  return {
    id: options.id || tagAssertionId(target, canonicalTagId),
    schema_version: 2,
    assertion_type: "tag_application",
    tag_id: canonicalTagId,
    legacy_tag_id: legacyTagId(canonicalTagId),
    target,
    target_id: target.target_id,
    actor: options.actor || {
      actor_type: "user",
      actor_id: "user:local",
    },
    confidence: Number.isFinite(options.confidence) ? options.confidence : 1,
    visibility: options.visibility || "private",
    review_status: active ? "accepted" : "superseded",
    active,
    revision: positiveInteger(options.revision) || 1,
    note: typeof options.note === "string" ? options.note : "",
    created_at: options.created_at || timestamp,
    updated_at: options.updated_at || timestamp,
    supersedes: options.supersedes || null,
  };
}

export function normalizeTagAssertion(assertion, fallbackKey = "") {
  if (!assertion || assertion.assertion_type !== "tag_application") return null;
  const target = normalizeTarget(
    assertion.target ||
      (assertion.reference_key || fallbackKey
        ? createVerseTarget(assertion.reference_key || fallbackKey, assertion.edition_id || "bsb")
        : null),
  );
  const tagId = tagDefinitionId(assertion.tag_id || assertion.legacy_tag_id);
  if (!target || !tagId) return null;
  const timestamp = assertion.updated_at || assertion.created_at || new Date().toISOString();
  const canonicalId = tagAssertionId(target, tagId);
  return {
    ...assertion,
    id: canonicalId,
    legacy_assertion_id: assertion.id && assertion.id !== canonicalId ? assertion.id : assertion.legacy_assertion_id || null,
    schema_version: 2,
    tag_id: tagId,
    legacy_tag_id: legacyTagId(tagId),
    target,
    target_id: target.target_id,
    actor: assertion.actor || { actor_type: "user", actor_id: "user:local" },
    confidence: Number.isFinite(assertion.confidence) ? assertion.confidence : 1,
    visibility: assertion.visibility || "private",
    review_status: assertion.review_status || (assertion.active === false ? "superseded" : "accepted"),
    active: assertion.active !== false,
    revision: positiveInteger(assertion.revision) || 1,
    note: typeof assertion.note === "string" ? assertion.note : "",
    created_at: assertion.created_at || timestamp,
    updated_at: timestamp,
    supersedes: assertion.supersedes || null,
  };
}

export function normalizeTagAssertionCollection(verseTags, assertions = {}) {
  const byId = {};
  const quarantined = [];
  Object.values(assertions || {}).forEach((assertion) => {
    if (assertion?.assertion_type && assertion.assertion_type !== "tag_application") return;
    const normalized = normalizeTagAssertion(assertion);
    if (!normalized) {
      quarantined.push({ reason: "invalid_or_incomplete_tag_assertion", record: assertion });
      return;
    }
    const current = byId[normalized.id];
    if (!current || String(normalized.updated_at).localeCompare(String(current.updated_at)) >= 0) {
      byId[normalized.id] = normalized;
    }
  });

  Object.entries(verseTags || {}).forEach(([key, tagIds]) => {
    if (!Array.isArray(tagIds)) return;
    tagIds.forEach((tagId) => {
      try {
        const assertion = createTagAssertion(key, tagId);
        if (!byId[assertion.id]) byId[assertion.id] = assertion;
      } catch {
        quarantined.push({ reason: "invalid_legacy_verse_tag", record: { key, tag_id: tagId } });
      }
    });
  });
  return { assertions: byId, quarantined };
}

export function normalizeTagAssertions(verseTags, assertions = {}) {
  return normalizeTagAssertionCollection(verseTags, assertions).assertions;
}

export function deriveVerseTagsFromAssertions(assertions) {
  const verseTags = {};
  Object.values(assertions || {}).forEach((assertion) => {
    if (!assertion?.active || assertion.assertion_type !== "tag_application") return;
    if (assertion.target?.target_type !== "verse") return;
    const key = referenceKeyFromTarget(assertion.target);
    const tagId = legacyTagId(assertion.tag_id || assertion.legacy_tag_id);
    if (!key || !tagId) return;
    verseTags[key] = [...new Set([...(verseTags[key] || []), tagId])].sort();
  });
  return verseTags;
}

export function deriveTagTargetIndex(assertions) {
  const index = {};
  Object.values(assertions || {}).forEach((assertion) => {
    if (!assertion?.active || assertion.assertion_type !== "tag_application") return;
    const tagId = tagDefinitionId(assertion.tag_id || assertion.legacy_tag_id);
    const id = targetId(assertion.target);
    if (!tagId || !id) return;
    index[tagId] = [...new Set([...(index[tagId] || []), id])].sort();
  });
  return index;
}
