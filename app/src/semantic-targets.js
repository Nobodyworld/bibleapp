export function tagDefinitionId(tagId) {
  return String(tagId || "").startsWith("tag:") ? String(tagId) : `tag:${tagId}`;
}

export function parseReferenceKey(key) {
  const [book_id, chapter, verse] = String(key || "").split(":");
  return { book_id, chapter, verse };
}

export function referenceKeyFromTarget(target) {
  const ref = target?.reference || {};
  if (!ref.book_id || !ref.chapter || !ref.verse_start) return null;
  return `${ref.book_id}:${ref.chapter}:${ref.verse_start}`;
}

export function createVerseTarget(key, editionId = "bsb") {
  const { book_id, chapter, verse } = parseReferenceKey(key);
  return {
    target_type: "verse",
    edition_id: editionId,
    reference: {
      book_id,
      chapter: Number(chapter),
      verse_start: Number(verse),
      verse_end: Number(verse),
    },
  };
}

export function createTextSpanTarget(key, anchor, editionId = "bsb") {
  return {
    ...createVerseTarget(key, editionId),
    target_type: "text_span",
    anchor,
  };
}

export function getTextSpanDriftStatus(target, currentText) {
  if (target?.target_type !== "text_span" || !target.anchor) return "not_text_span";
  const { char_start, char_end, text_snapshot } = target.anchor;
  if (!Number.isInteger(char_start) || !Number.isInteger(char_end) || char_end < char_start) return "invalid_anchor";
  if (typeof currentText !== "string" || char_end > currentText.length) return "out_of_bounds";
  return currentText.slice(char_start, char_end) === text_snapshot ? "current" : "drifted";
}

export function tagAssertionId(key, tagId) {
  return `assertion:tag:${String(key).replaceAll(":", ".")}:${String(tagId).replace(/^tag:/, "")}`;
}

export function createTagAssertion(key, tagId, options = {}) {
  const timestamp = options.timestamp || new Date().toISOString();
  const active = options.active !== false;
  return {
    id: options.id || tagAssertionId(key, tagId),
    schema_version: 1,
    assertion_type: "tag_application",
    tag_id: tagDefinitionId(tagId),
    legacy_tag_id: String(tagId || "").replace(/^tag:/, ""),
    target: options.target || createVerseTarget(key, options.edition_id || "bsb"),
    actor: options.actor || {
      actor_type: "user",
      actor_id: "user:local",
    },
    confidence: Number.isFinite(options.confidence) ? options.confidence : 1,
    visibility: options.visibility || "private",
    review_status: active ? "accepted" : "superseded",
    active,
    created_at: options.created_at || timestamp,
    updated_at: options.updated_at || timestamp,
    supersedes: options.supersedes || null,
  };
}

export function normalizeTagAssertion(assertion, fallbackKey = "") {
  if (!assertion?.id || assertion.assertion_type !== "tag_application") return null;
  const timestamp = assertion.updated_at || assertion.created_at || new Date().toISOString();
  const target = assertion.target || createVerseTarget(assertion.reference_key || fallbackKey);
  const tagId = assertion.tag_id || tagDefinitionId(assertion.legacy_tag_id || "");
  return {
    ...assertion,
    schema_version: Number(assertion.schema_version || 1),
    tag_id: tagDefinitionId(tagId),
    legacy_tag_id: assertion.legacy_tag_id || String(tagId).replace(/^tag:/, ""),
    target,
    actor: assertion.actor || { actor_type: "user", actor_id: "user:local" },
    confidence: Number.isFinite(assertion.confidence) ? assertion.confidence : 1,
    visibility: assertion.visibility || "private",
    review_status: assertion.review_status || (assertion.active === false ? "superseded" : "accepted"),
    active: assertion.active !== false,
    created_at: assertion.created_at || timestamp,
    updated_at: timestamp,
    supersedes: assertion.supersedes || null,
  };
}

export function normalizeTagAssertions(verseTags, assertions = {}) {
  const byId = {};
  Object.values(assertions || {}).forEach((assertion) => {
    const normalized = normalizeTagAssertion(assertion);
    if (normalized) byId[normalized.id] = normalized;
  });

  Object.entries(verseTags || {}).forEach(([key, tagIds]) => {
    if (!Array.isArray(tagIds)) return;
    tagIds.forEach((tagId) => {
      const id = tagAssertionId(key, tagId);
      if (!byId[id]) byId[id] = createTagAssertion(key, tagId);
    });
  });
  return byId;
}

export function deriveVerseTagsFromAssertions(assertions) {
  const verseTags = {};
  Object.values(assertions || {}).forEach((assertion) => {
    if (!assertion?.active || assertion.assertion_type !== "tag_application") return;
    const key = referenceKeyFromTarget(assertion.target);
    const tagId = assertion.legacy_tag_id || String(assertion.tag_id || "").replace(/^tag:/, "");
    if (!key || !tagId) return;
    verseTags[key] = [...new Set([...(verseTags[key] || []), tagId])].sort();
  });
  return verseTags;
}
