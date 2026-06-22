const DEFAULT_ACTOR = { actor_type: "user", actor_id: "user:local" };

function safeId(value) {
  return String(value || "")
    .replace(/^proposition:/, "")
    .replace(/[^a-z0-9_-]+/gi, ".");
}

export function pollResponseId(propositionId, actor = DEFAULT_ACTOR, propositionVersion = 1) {
  return `poll-response:${safeId(propositionId)}:v${Number(propositionVersion || 1)}:${safeId(actor.actor_id || "user.local")}`;
}

export function createPollResponse(proposition, response, options = {}) {
  if (!proposition?.id?.startsWith("proposition:")) {
    throw new Error("Poll response requires a proposition id.");
  }
  if (!Array.isArray(proposition.options) || !proposition.options.includes(response)) {
    throw new Error(`Response "${response}" is not valid for ${proposition.id}.`);
  }
  const actor = options.actor || DEFAULT_ACTOR;
  const timestamp = options.timestamp || new Date().toISOString();
  return {
    id: options.id || pollResponseId(proposition.id, actor, proposition.version),
    schema_version: 1,
    proposition_id: proposition.id,
    proposition_version: Number(proposition.version || 1),
    proposition_target: proposition.target,
    actor,
    response,
    status: options.status || "active",
    confidence: Number.isFinite(options.confidence) ? options.confidence : 1,
    visibility: options.visibility || "private",
    viewed_aggregate_before_response: Boolean(options.viewed_aggregate_before_response),
    created_at: options.created_at || timestamp,
    updated_at: options.updated_at || timestamp,
    supersedes: options.supersedes || null,
  };
}

export function normalizePollResponse(response) {
  if (!response?.id || !response.proposition_id || !response.response) return null;
  const timestamp = response.updated_at || response.created_at || new Date().toISOString();
  return {
    ...response,
    schema_version: Number(response.schema_version || 1),
    proposition_version: Number(response.proposition_version || 1),
    actor: response.actor || DEFAULT_ACTOR,
    confidence: Number.isFinite(response.confidence) ? response.confidence : 1,
    status: response.status || "active",
    visibility: response.visibility || "private",
    viewed_aggregate_before_response: Boolean(response.viewed_aggregate_before_response),
    created_at: response.created_at || timestamp,
    updated_at: timestamp,
    supersedes: response.supersedes || null,
  };
}

export function aggregatePollResponses(responses = {}) {
  const aggregates = {};
  Object.values(responses || {}).forEach((response) => {
    const normalized = normalizePollResponse(response);
    if (!normalized) return;
    if (normalized.status === "deleted") return;
    const aggregateId = `${normalized.proposition_id}@v${normalized.proposition_version}`;
    const aggregate = aggregates[aggregateId] || {
      proposition_id: normalized.proposition_id,
      proposition_version: normalized.proposition_version,
      sample_size: 0,
      responses: {},
      visibility: "local_private",
      collection_scope: "current_user_export",
    };
    aggregate.sample_size += 1;
    aggregate.responses[normalized.response] = (aggregate.responses[normalized.response] || 0) + 1;
    aggregates[aggregateId] = aggregate;
  });
  return aggregates;
}
