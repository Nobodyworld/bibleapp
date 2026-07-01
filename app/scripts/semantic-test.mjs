#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = join(appRoot, "data");

const targetTypes = new Set([
  "book",
  "chapter",
  "verse",
  "verse_range",
  "text_span",
  "source_token",
  "source_token_span",
  "lexeme",
  "strongs_entry",
  "translation_rendering",
  "commentary_entry",
  "outline_item",
  "cross_reference",
  "interpretation_proposition",
  "tag_definition",
]);

const relationTypes = new Set([
  "broader_than",
  "narrower_than",
  "related_to",
  "opposite_of",
  "frequently_cooccurs_with",
  "incompatible_with",
  "derived_from",
  "translation_variant_of",
]);

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(dataRoot, relativePath), "utf8"));
}

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function assert(condition, message, details = {}) {
  if (!condition) fail(message, details);
}

function assertUnique(items, getId, label) {
  const seen = new Set();
  const duplicates = [];
  for (const item of items) {
    const id = getId(item);
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  assert(duplicates.length === 0, `${label} must have unique ids.`, { duplicates });
}

async function verseExists(target) {
  const reference = target?.reference || {};
  if (!reference.book_id || !reference.chapter || !reference.verse_start) return false;
  const path = join(dataRoot, "verses", target.edition_id || "bsb", `${reference.book_id}.json`);
  if (!existsSync(path)) return false;
  const book = JSON.parse(await readFile(path, "utf8"));
  for (let verse = Number(reference.verse_start); verse <= Number(reference.verse_end || reference.verse_start); verse += 1) {
    if (!book.chapters?.[String(reference.chapter)]?.[String(verse)]) return false;
  }
  return true;
}

function validateTarget(target, context) {
  assert(target && typeof target === "object", "Semantic target must be an object.", { context, target });
  assert(targetTypes.has(target.target_type), "Semantic target has unknown target_type.", { context, target_type: target.target_type });
  if (["verse", "verse_range", "text_span"].includes(target.target_type)) {
    assert(target.edition_id, "Textual targets must declare edition_id.", { context, target });
    assert(target.reference?.book_id, "Textual targets must declare reference.book_id.", { context, target });
    assert(Number.isInteger(target.reference?.chapter), "Textual targets must declare integer reference.chapter.", { context, target });
    assert(Number.isInteger(target.reference?.verse_start), "Textual targets must declare integer reference.verse_start.", { context, target });
    assert(
      target.reference.verse_end === undefined || Number.isInteger(target.reference.verse_end),
      "Textual target reference.verse_end must be an integer when present.",
      { context, target },
    );
  }
}

function validateDefinitions(payload) {
  assert(payload.schema_version === 1, "Tag definitions payload must use schema_version 1.");
  const definitions = payload.definitions || [];
  assert(definitions.length > 0, "Tag definitions payload must not be empty.");
  assertUnique(definitions, (item) => item.id, "Tag definitions");

  for (const definition of definitions) {
    assert(/^tag:/.test(definition.id), "Tag definition id must start with tag:.", { definition });
    assert(definition.schema_version === 1, "Tag definition must use schema_version 1.", { definition });
    assert(definition.namespace === "system", "Seed tag definitions must use system namespace.", { definition });
    assert(definition.label, "Tag definition must have a label.", { definition });
    assert(Array.isArray(definition.allowed_target_types) && definition.allowed_target_types.length, "Tag definition must list allowed target types.", {
      definition,
    });
    for (const type of definition.allowed_target_types) {
      assert(targetTypes.has(type), "Tag definition allowed_target_types contains unknown target type.", { definition: definition.id, type });
    }
    assert(["active", "draft", "deprecated", "retired"].includes(definition.status), "Tag definition has invalid status.", { definition });
    if (definition.status === "retired") {
      assert(definition.retired_at, "Retired tag definitions must record retired_at.", { definition });
      assert(
        definition.replacement_id === null || /^tag:/.test(definition.replacement_id || ""),
        "Retired tag definition replacement_id must be null or a tag id.",
        { definition },
      );
    }
  }

  const legacyIds = new Set(definitions.map((item) => item.legacy_id).filter(Boolean));
  ["positive_sentiment", "negative_sentiment", "command_declaration", "question"].forEach((legacyId) => {
    assert(legacyIds.has(legacyId), "Semantic tag definitions must map existing default tag ids.", { legacyId });
  });

  return definitions;
}

function validateRelations(payload, definitions) {
  assert(payload.schema_version === 1, "Tag relations payload must use schema_version 1.");
  const definitionIds = new Set(definitions.map((definition) => definition.id));
  const relations = payload.relations || [];
  assertUnique(relations, (item) => `${item.source_tag_id}:${item.relation}:${item.target_tag_id}`, "Tag relations");
  for (const relation of relations) {
    assert(definitionIds.has(relation.source_tag_id), "Tag relation source_tag_id does not resolve.", { relation });
    assert(definitionIds.has(relation.target_tag_id), "Tag relation target_tag_id does not resolve.", { relation });
    assert(relationTypes.has(relation.relation), "Tag relation type is invalid.", { relation });
    assert(relation.source_tag_id !== relation.target_tag_id, "Tag relation must not point to itself.", { relation });
    assert(["active", "draft", "deprecated"].includes(relation.status), "Tag relation has invalid status.", { relation });
  }
  return relations;
}

async function validatePropositions(payload) {
  assert(payload.schema_version === 1, "Interpretation propositions payload must use schema_version 1.");
  const propositions = payload.propositions || [];
  assert(propositions.length > 0, "Interpretation propositions payload must not be empty.");
  assertUnique(propositions, (item) => item.id, "Interpretation propositions");

  for (const proposition of propositions) {
    assert(/^proposition:/.test(proposition.id), "Proposition id must start with proposition:.", { proposition });
    assert(proposition.schema_version === 1, "Proposition must use schema_version 1.", { proposition });
    validateTarget(proposition.target, proposition.id);
    assert(await verseExists(proposition.target), "Proposition target does not resolve to packaged verse text.", {
      proposition: proposition.id,
      target: proposition.target,
    });
    assert(proposition.prompt && proposition.prompt.endsWith("?"), "Proposition prompt must be phrased as a question.", { proposition });
    assert(proposition.response_type === "agreement_scale", "Seed propositions must use agreement_scale response type.", { proposition });
    assert(Array.isArray(proposition.options) && proposition.options.includes("uncertain"), "Propositions must include an uncertain option.", { proposition });
    assert(["active", "draft", "retired"].includes(proposition.status), "Proposition has invalid status.", { proposition });
    assert(!("responses" in proposition), "Proposition seed data must not contain poll responses.", { proposition: proposition.id });
    assert(!("aggregate" in proposition) && !("aggregates" in proposition), "Proposition seed data must not contain aggregates.", {
      proposition: proposition.id,
    });
  }
  return propositions;
}

async function main() {
  const [manifest, definitionsPayload, relationsPayload, propositionsPayload] = await Promise.all([
    readJson("semantic/manifest.json"),
    readJson("semantic/tag-definitions.json"),
    readJson("semantic/tag-relations.json"),
    readJson("semantic/interpretation-propositions.json"),
  ]);

  assert(manifest.schema_version === 1, "Semantic manifest must use schema_version 1.");
  for (const path of Object.values(manifest.files || {})) {
    assert(existsSync(join(dataRoot, path)), "Semantic manifest references missing file.", { path });
  }

  const definitions = validateDefinitions(definitionsPayload);
  const relations = validateRelations(relationsPayload, definitions);
  const propositions = await validatePropositions(propositionsPayload);

  assert(manifest.counts?.tag_definitions === definitions.length, "Semantic manifest tag definition count is stale.", {
    manifest: manifest.counts?.tag_definitions,
    actual: definitions.length,
  });
  assert(manifest.counts?.tag_relations === relations.length, "Semantic manifest tag relation count is stale.", {
    manifest: manifest.counts?.tag_relations,
    actual: relations.length,
  });
  assert(manifest.counts?.interpretation_propositions === propositions.length, "Semantic manifest proposition count is stale.", {
    manifest: manifest.counts?.interpretation_propositions,
    actual: propositions.length,
  });

  console.log(
    JSON.stringify(
      {
        semanticManifest: manifest.counts,
        tagDefinitions: definitions.map((item) => item.id),
        tagRelations: relations.length,
        interpretationPropositions: propositions.map((item) => ({
          id: item.id,
          target: item.target.reference,
          status: item.status,
        })),
        assertionBoundary: "definitions and propositions only; no user assertions, poll responses, or aggregates are packaged here",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exitCode = 1;
});
