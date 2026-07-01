#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { assertValidJsonSchema } from "./schema-validation.mjs";
import { aggregatePollResponses, createPollResponse, pollResponseId } from "../src/semantic-polls.js";
import { createUserDataExport, deletePollResponse, getUserDataSummary, importUserData, setPollResponse } from "../src/stores.js";

const appRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:\/)/, "$1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const propositionData = await readJson(join(appRoot, "data", "semantic", "interpretation-propositions.json"));
  const pollResponseSchema = await readJson(join(appRoot, "schemas", "poll-response.schema.json"));
  const proposition = propositionData.propositions.find((item) => item.id === "proposition:john-1-1-logos-eternal-existence");
  assert(proposition, "test proposition must exist");

  const response = createPollResponse(proposition, "agree", {
    timestamp: "2026-06-20T00:00:00.000Z",
    confidence: 0.75,
  });
  assert(response.id === pollResponseId(proposition.id, undefined, proposition.version), "poll response id must be deterministic per proposition/version/actor");
  assert(response.proposition_id === proposition.id, "poll response must reference proposition id");
  assert(response.proposition_version === proposition.version, "poll response must preserve proposition version");
  assert(response.proposition_target?.reference?.book_id === "john", "poll response must preserve proposition target");
  assert(response.visibility === "private", "poll response must default private");
  assert(response.viewed_aggregate_before_response === false, "poll response should record aggregate exposure");
  assertValidJsonSchema(response, pollResponseSchema, {}, "poll response");

  let invalidResponseRejected = false;
  try {
    createPollResponse(proposition, "yes");
  } catch {
    invalidResponseRejected = true;
  }
  assert(invalidResponseRejected, "invalid response option must be rejected");

  const aggregate = aggregatePollResponses({ [response.id]: response });
  const aggregateId = `${proposition.id}@v${proposition.version}`;
  assert(aggregate[aggregateId].sample_size === 1, "local aggregate must count response");
  assert(aggregate[aggregateId].responses.agree === 1, "local aggregate must count response option");
  assert(aggregate[aggregateId].visibility === "local_private", "local aggregate must be marked private");

  const state = {};
  const stored = setPollResponse(state, proposition, "agree", { confidence: 0.8 });
  assert(stored.response === "agree", "setPollResponse must store selected response");
  assert(Object.keys(state.pollStore.responses).length === 1, "poll store must hold response");
  assert(state.pollStore.events.length === 1, "poll store must append created event");
  assert(state.pollStore.aggregates[`${proposition.id}@v${proposition.version}`].sample_size === 1, "poll store must update local aggregate");

  const updated = setPollResponse(state, proposition, "strongly_agree");
  assert(updated.response === "strongly_agree", "setPollResponse must update existing response");
  assert(updated.previous_response === "agree", "updated response must preserve previous response value");
  assert(updated.supersedes === updated.id, "updated response must supersede prior response revision without adding a count");
  assert(Object.keys(state.pollStore.responses).length === 1, "updated poll response must replace same actor/proposition/version record");
  assert(
    state.pollStore.aggregates[`${proposition.id}@v${proposition.version}`].responses.strongly_agree === 1,
    "updated poll response must count only the current response",
  );
  assert(
    !state.pollStore.aggregates[`${proposition.id}@v${proposition.version}`].responses.agree,
    "updated poll response must not inflate old response counts",
  );
  const nextVersion = { ...proposition, version: proposition.version + 1 };
  setPollResponse(state, nextVersion, "uncertain");
  assert(Object.keys(state.pollStore.responses).length === 2, "new proposition version must keep a distinct response record");
  assert(state.pollStore.aggregates[`${nextVersion.id}@v${nextVersion.version}`].sample_size === 1, "new proposition version must aggregate separately");
  assert(state.pollStore.events.some((event) => event.event_type === "poll_response_updated"), "update event must be recorded");
  assert(
    Object.keys(state.assertionStore.assertions || {}).length === 0,
    "poll responses must remain separate from assertion store unless explicitly converted later",
  );

  const exported = createUserDataExport(state);
  assert(exported.stores.polls.responses[updated.id], "user export must include poll response store");
  Object.values(exported.stores.polls.responses || {}).forEach((item) => {
    assertValidJsonSchema(item, pollResponseSchema, {}, item.id);
  });

  const deleted = deletePollResponse(state, proposition);
  assert(deleted.status === "deleted", "poll deletion must use an explicit tombstone");
  assert(deleted.deletion_policy === "tombstone", "poll deletion policy must be explicit");
  assert(
    !state.pollStore.aggregates[`${proposition.id}@v${proposition.version}`],
    "deleted poll response must be excluded from current local aggregate",
  );

  const tombstoneExport = createUserDataExport(state);
  const importedState = {};
  const summary = importUserData(importedState, tombstoneExport, "replace");
  assert(summary.poll_responses === 2, "import must preserve poll response count");
  assert(summary.poll_events === 4, "import must preserve poll response event log");
  assert(summary.poll_aggregates === 1, "import must rebuild local poll aggregates without deleted responses");
  assert(importedState.pollStore.responses[updated.id].status === "deleted", "import must preserve poll tombstone");

  console.log(
    JSON.stringify(
      {
        proposition: proposition.id,
        responseId: updated.id,
        pollResponses: summary.poll_responses,
        pollEvents: summary.poll_events,
        deletionPolicy: importedState.pollStore.responses[updated.id].deletion_policy,
        aggregate: importedState.pollStore.aggregates[aggregateId] || null,
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
