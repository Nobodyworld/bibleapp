#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { assertValidJsonSchema } from "./schema-validation.mjs";
import {
  createTagAssertion,
  createTextSpanTarget,
  createVerseTarget,
  deriveVerseTagsFromAssertions,
  getTextSpanDriftStatus,
  normalizeTagAssertions,
  tagAssertionId,
  tagDefinitionId,
} from "../src/semantic-targets.js";
import { projectAssertionsToSemanticGraph } from "../src/semantic-graph.js";
import {
  createUserDataExport,
  getUserDataSummary,
  importUserData,
  normalizeAssertionStore,
  normalizeTagStore,
  createCustomTag,
  deleteCustomTag,
  setVerseDraft,
  setVerseTag,
  updateCustomTag,
} from "../src/stores.js";

const appRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:\/)/, "$1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assertVerseTarget(target, bookId, chapter, verse) {
  assert(target?.target_type === "verse", "target must be a verse target");
  assert(target.edition_id === "bsb", "target must default to BSB edition");
  assert(target.reference?.book_id === bookId, "target book mismatch");
  assert(target.reference?.chapter === chapter, "target chapter mismatch");
  assert(target.reference?.verse_start === verse, "target verse_start mismatch");
  assert(target.reference?.verse_end === verse, "target verse_end mismatch");
}

async function main() {
  const semanticTags = await readJson(join(appRoot, "data", "semantic", "tag-definitions.json"));
  const targetSchema = await readJson(join(appRoot, "schemas", "target.schema.json"));
  const assertionSchema = await readJson(join(appRoot, "schemas", "assertion.schema.json"));
  const packagedTagIds = new Set(semanticTags.definitions.map((tag) => tag.id));

  assert(tagDefinitionId("question") === "tag:question", "legacy tag id must normalize to semantic tag id");
  assert(tagDefinitionId("tag:question") === "tag:question", "semantic tag id must remain stable");

  const verseTarget = createVerseTarget("john:1:1");
  assertVerseTarget(verseTarget, "john", 1, 1);

  const spanTarget = createTextSpanTarget("john:1:1", {
    char_start: 0,
    char_end: 16,
    text_snapshot: "In the beginning",
    text_hash: "sha256:test",
    normalization: "NFC",
    normalization_version: "clean-app-v1",
    edition_content_version: "test",
    context_before: "",
    context_after: " was",
    anchor_generation_method: "test",
    confidence: 1,
    review_status: "accepted",
  });
  assert(spanTarget.target_type === "text_span", "text span target must preserve target_type");
  assert(spanTarget.anchor?.text_snapshot === "In the beginning", "text span target must preserve anchor");
  assertValidJsonSchema(spanTarget, targetSchema, {}, "text span target");
  assert(getTextSpanDriftStatus(spanTarget, "In the beginning was the Word") === "current", "matching text span must be current");
  assert(getTextSpanDriftStatus(spanTarget, "At the beginning was the Word") === "drifted", "changed edition text must mark span drift");

  const assertion = createTagAssertion("john:1:1", "question", {
    timestamp: "2026-06-20T00:00:00.000Z",
  });
  assert(assertion.id === tagAssertionId("john:1:1", "question"), "tag assertion id must be deterministic");
  assert(assertion.assertion_type === "tag_application", "tag assertion type mismatch");
  assert(assertion.tag_id === "tag:question", "tag assertion must point to semantic tag id");
  assert(packagedTagIds.has(assertion.tag_id), "tag assertion must resolve to packaged semantic tag definition");
  assertVerseTarget(assertion.target, "john", 1, 1);
  assert(assertion.actor.actor_type === "user", "tag assertion must preserve actor");
  assert(assertion.visibility === "private", "local tag assertion must default to private");
  assert(assertion.review_status === "accepted", "enabled tag assertion must be accepted");
  assertValidJsonSchema(assertion, assertionSchema, { schemas: { "target.schema.json": targetSchema } }, "tag assertion");

  const inactive = createTagAssertion("john:1:1", "question", { active: false });
  assert(inactive.review_status === "superseded", "inactive tag assertion must be superseded");

  const assertions = normalizeTagAssertions({ "john:1:1": ["question"] }, {});
  assert(assertions[assertion.id], "legacy verse_tags must produce a tag assertion");
  assertVerseTarget(assertions[assertion.id].target, "john", 1, 1);

  const derivedVerseTags = deriveVerseTagsFromAssertions(assertions);
  assert(derivedVerseTags["john:1:1"]?.includes("question"), "active assertions must derive verse_tags");

  const store = normalizeTagStore({
    version: 1,
    tags: {
      custom_observation: {
        id: "custom_observation",
        label: "Observation",
        icon: "O",
        color: "#445566",
        custom: true,
      },
    },
    verse_tags: {
      "john:1:1": ["question", "custom_observation"],
    },
  });

  assert(store.version === 4, "tag store version must normalize to current runtime version");
  assert(store.tags.question.tag_definition_id === "tag:question", "default tag must expose semantic definition id");
  assert(store.tags.custom_observation.tag_definition_id === "tag:custom_observation", "custom tag must expose semantic definition id");
  assert(store.verse_tags["john:1:1"].includes("question"), "normalized store must preserve legacy default tag assignment");
  assert(store.verse_tags["john:1:1"].includes("custom_observation"), "normalized store must preserve custom tag assignment");

  const questionAssertion = store.tag_assertions[tagAssertionId("john:1:1", "question")];
  const customAssertion = store.tag_assertions[tagAssertionId("john:1:1", "custom_observation")];
  assert(questionAssertion?.tag_id === "tag:question", "default tag assignment must become semantic assertion");
  assert(customAssertion?.tag_id === "tag:custom_observation", "custom tag assignment must become semantic assertion");
  assertVerseTarget(questionAssertion.target, "john", 1, 1);
  assertVerseTarget(customAssertion.target, "john", 1, 1);

  const assertionStore = normalizeAssertionStore({}, store.tag_assertions);
  assert(
    assertionStore.assertions[tagAssertionId("john:1:1", "question")],
    "assertion store must seed from tag assertions",
  );

  const graph = projectAssertionsToSemanticGraph(assertionStore.assertions);
  assert(graph.counts.assertions === 2, "semantic graph projection must count active assertions");
  assert(
    graph.nodes.some((node) => node.id === questionAssertion.target_id),
    "semantic graph must contain canonical target verse node",
  );
  assert(graph.nodes.some((node) => node.id === "tag:question"), "semantic graph must contain tag definition node");
  assert(
    graph.edges.some((edge) => edge.type === "tagged_as" && edge.to === "tag:question"),
    "semantic graph must project tag assertions into tagged_as edges",
  );
  assert(
    graph.edges.every((edge) => edge.source?.source_type === "assertion" && edge.source.id === edge.assertion_id),
    "semantic graph edges must identify their source assertion",
  );

  const runtimeState = {};
  setVerseTag(runtimeState, "john:1:1", "question", true);
  const runtimeAssertion = runtimeState.assertionStore.assertions[tagAssertionId("john:1:1", "question")];
  assert(runtimeAssertion?.active === true, "setVerseTag must write through to assertion store");
  assert(runtimeState.assertionStore.events.length === 1, "setVerseTag must append assertion event");
  assert(
    runtimeState.assertionStore.events[0].event_type === "tag_assertion_applied",
    "setVerseTag must record applied event type",
  );

  setVerseTag(runtimeState, "john:1:1", "question", false);
  assert(runtimeState.assertionStore.assertions[tagAssertionId("john:1:1", "question")].active === false);
  assert(
    runtimeState.assertionStore.events.some((event) => event.event_type === "tag_assertion_superseded"),
    "disabling a tag must record superseded event",
  );

  const customTag = createCustomTag(runtimeState, {
    label: "Temporary Study Marker",
    color: "#445566",
    icon: "T",
    description: "Created for tombstone test",
  });
  assert(customTag?.tag_definition_id?.startsWith("tag:"), "custom tag must expose semantic id");
  setVerseTag(runtimeState, "john:1:2", customTag.id, true);
  assert(deleteCustomTag(runtimeState, customTag.id) === true, "custom tag retirement must succeed");
  const retiredTag = runtimeState.tagStore.tags[customTag.id];
  assert(retiredTag?.status === "retired", "deleted custom tag must leave a retired tombstone");
  assert(retiredTag.retired_at, "retired tag tombstone must record retired_at");
  assert(retiredTag.replacement_id === null, "retired tag tombstone must explicitly record null replacement");
  const retiredAssertion = runtimeState.assertionStore.assertions[tagAssertionId("john:1:2", customTag.id)];
  assert(retiredAssertion?.active === false, "retiring a tag must supersede matching assertions");

  const revisionTag = createCustomTag(runtimeState, {
    label: "Revision Marker",
    color: "#445566",
    icon: "R",
  });
  const updatedRevisionTag = updateCustomTag(
    runtimeState,
    revisionTag.id,
    { label: "Revision Marker Updated", color: "#315f99", icon: "U", description: "" },
    { expected_revision: revisionTag.revision },
  );
  assert(updatedRevisionTag?.revision === revisionTag.revision + 1, "tag updates must advance revision");
  const staleTagUpdate = updateCustomTag(
    runtimeState,
    revisionTag.id,
    { label: "Stale Revision Marker", color: "#315f99", icon: "S", description: "" },
    { expected_revision: revisionTag.revision },
  );
  assert(staleTagUpdate?.conflict?.conflict_type === "tag_definition_revision_mismatch", "stale tag update must report a conflict");

  const draft = setVerseDraft(runtimeState, "john:1:3", "First draft", { expected_revision: 0 });
  assert(draft?.revision === 1, "new draft must start at revision 1");
  const updatedDraft = setVerseDraft(runtimeState, "john:1:3", "Second draft", { expected_revision: 1 });
  assert(updatedDraft?.revision === 2, "draft updates must advance revision");
  const staleDraft = setVerseDraft(runtimeState, "john:1:3", "Stale draft", { expected_revision: 1 });
  assert(
    staleDraft?.conflict?.conflict_type === "translation_draft_revision_mismatch",
    "stale translation draft must report a conflict",
  );

  const exported = createUserDataExport(runtimeState);
  assert(exported.stores.assertions, "user data export must include assertion store");
  Object.values(exported.stores.assertions.assertions || {}).forEach((item) => {
    assertValidJsonSchema(item, assertionSchema, { schemas: { "target.schema.json": targetSchema } }, item.id);
  });

  const importedState = {};
  const summary = importUserData(importedState, exported, "replace");
  assert(summary.assertions === 0, "superseded-only import should not count active assertions");
  assert(summary.assertion_events === 4, "imported assertion event log must be preserved");
  assert(summary.last_import_backup?.reason === "before-replace-import", "replace import must create a recovery backup");

  const corruptImportState = {};
  const corruptPayload = createUserDataExport(runtimeState);
  corruptPayload.stores.assertions.assertions.corrupt = { target: createVerseTarget("john:1:3") };
  const corruptSummary = importUserData(corruptImportState, corruptPayload, "replace");
  assert(corruptSummary.quarantined_assertion_records === 1, "corrupt assertion records must be quarantined on import");

  console.log(
    JSON.stringify(
      {
        targetModel: "ok",
        legacyVerseTagsMigrated: Object.keys(store.tag_assertions).length,
        assertionStoreRecords: Object.keys(assertionStore.assertions).length,
        semanticGraphEdges: graph.counts.edges,
        assertionEvents: runtimeState.assertionStore.events.length,
        packagedSemanticTagDefinitions: packagedTagIds.size,
        defaultAssertionTarget: questionAssertion.target,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
