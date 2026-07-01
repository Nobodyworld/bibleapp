#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JOB_TYPES } from "../src/config.js";
import { canRunJob, runJob } from "../src/job-processor.js";
import {
  completeJob,
  createCustomTag,
  ensureStores,
  getAllJobEvents,
  setTokenRendering,
  setVerseDraft,
} from "../src/stores.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = join(appRoot, "data");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(dataRoot, relativePath), "utf8"));
}

async function main() {
  const state = {};
  ensureStores(state);
  const analysisManifest = await readJson("analysis/manifest.json");

  const referenceKey = "proverbs:1:1";
  setVerseDraft(state, referenceKey, "These are the proverbs of Solomon, son of David, king of Israel.");
  setTokenRendering(
    state,
    referenceKey,
    {
      token_index: 1,
      original: "מִשְׁלֵי",
      strong_code: "H4912",
    },
    "proverbs",
  );

  const jobs = getAllJobEvents(state);
  for (const plannedJobType of analysisManifest.planned_job_types || []) {
    const declaredJob = { type: plannedJobType, job_type: plannedJobType };
    assert(canRunJob(declaredJob), `${plannedJobType} must have a real runtime processor or be explicit simulation_only`);
  }

  const job = jobs.find((item) => item.type === JOB_TYPES.wordMapRefresh && item.payload.reference_key === referenceKey);
  assert(job, "word-map-refresh job was not queued");
  assert(canRunJob(job), "word-map-refresh job should have a runtime processor");

  const result = await runJob(job, state, {
    loadWordMapBook: (translationId, bookId) => readJson(`analysis/word-map/${translationId}/${bookId}.json`),
  });

  assert(result.processor === "word-map-refresh-v1", "processor id missing from word-map result");
  assert(result.processor_version === "word-map-refresh-v1", "processor version missing from word-map result");
  assert(result.runner === "word-map-refresh-v1", "unexpected job runner");
  assert(result.status === "completed", "job result status must be completed");
  assert(result.result_status === "current", "word-map result must be current before input changes");
  assert(result.input_revision_id === "translation-draft:proverbs:1:1:r1", "word-map result must record input revision");
  assert(Array.isArray(result.findings), "word-map result must include typed findings");
  assert(result.reference.book_id === "proverbs", "job did not resolve the Proverbs target");
  assert(result.packaged_word_map.existing_spans_for_verse === 6, "unexpected Proverbs 1:1 word-map span count");
  assert(result.workspace_inputs.has_draft, "draft text was not included in job analysis");
  assert(result.workspace_inputs.token_rendering_count === 1, "token rendering was not included in job analysis");
  assert(result.proposed_refresh.canonical_data_mutation === false, "runtime job must not mutate canonical data");
  assert(result.proposed_refresh.affected_spans.some((span) => span.strong_code === "H4912"), "affected span missing H4912");

  const completed = completeJob(state, job.store, job.id, result, "completed");
  assert(completed?.state === "completed", "completed job state was not persisted");
  assert(completed.result?.runner === "word-map-refresh-v1", "completed job result was not persisted");
  setVerseDraft(state, referenceKey, "The proverbs of Solomon, son of David, king of Israel.");
  const staleJob = getAllJobEvents(state).find((item) => item.id === completed.id);
  assert(staleJob.result?.result_status === "stale", "changed draft input must mark prior word-map result stale");

  const translationJob = getAllJobEvents(state).find(
    (item) => item.type === JOB_TYPES.translationEditAnalysis && item.payload.reference_key === referenceKey,
  );
  assert(translationJob, "translation-edit-analysis job was not queued");
  const translationResult = await runJob(translationJob, state);
  assert(translationResult.processor === "translation-edit-analysis-v1", "translation processor missing");
  assert(translationResult.input_revision_id === "translation-draft:proverbs:1:1:r2", "translation result revision missing");
  assert(Array.isArray(translationResult.findings), "translation result must include findings");

  const glossaryJob = getAllJobEvents(state).find(
    (item) => item.type === JOB_TYPES.personalGlossaryBuild && item.payload.reference_key === referenceKey,
  );
  assert(glossaryJob, "personal-glossary-build job was not queued");
  const glossaryResult = await runJob(glossaryJob, state);
  assert(glossaryResult.processor === "personal-glossary-build-v1", "glossary processor missing");
  assert(
    glossaryResult.glossary_candidates?.[0]?.observed_draft_rendering === "proverbs",
    "glossary result must separate observed draft rendering",
  );
  assert(glossaryResult.glossary_candidates[0].accepted_entry === false, "glossary candidate must not auto-accept");

  const customTag = createCustomTag(state, { label: "Job Test Tag", icon: "J", color: "#335577" });
  const tagJob = getAllJobEvents(state).find(
    (item) => item.type === JOB_TYPES.tagIndexRefresh && item.payload.tag_id === customTag.tag_definition_id,
  );
  assert(tagJob, "tag-index-refresh job was not queued");
  const tagResult = await runJob(tagJob, state);
  assert(tagResult.processor === "tag-index-refresh-v1", "tag index processor missing");
  assert(tagResult.findings[0].disposable_projection === true, "tag index must be a disposable derived projection");
  assert(tagResult.findings[0].mutates_assertions === false, "tag index processor must not mutate assertions");

  const report = {
    queuedJobs: jobs.length,
    declaredJobTypes: analysisManifest.planned_job_types,
    processedJob: {
      id: completed.id,
      type: completed.type,
      state: completed.state,
      reference: completed.result.reference.reference_key,
      resultStatusAfterInputChange: staleJob.result.result_status,
      existingSpans: completed.result.packaged_word_map.existing_spans_for_verse,
      affectedSpans: completed.result.packaged_word_map.affected_existing_spans,
      tokenRenderings: completed.result.workspace_inputs.token_rendering_count,
      canonicalDataMutation: completed.result.proposed_refresh.canonical_data_mutation,
    },
    processors: {
      translation: translationResult.processor,
      glossary: glossaryResult.processor,
      tagIndex: tagResult.processor,
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
