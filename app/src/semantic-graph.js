import { targetId } from "./semantic-targets.js?v=pr13-live-qa-20260711e";

function targetNodeId(target) {
  if (!target) return null;
  const canonicalTargetId = targetId(target);
  if (canonicalTargetId) return canonicalTargetId;
  if (target.target_type === "tag_definition" && target.id) return target.id;
  if (target.target_type === "interpretation_proposition" && target.id) return target.id;
  if (target.target_type === "strongs_entry" && target.id) return target.id;
  return target.id || null;
}

function addNode(nodes, node) {
  if (!node?.id || nodes.has(node.id)) return;
  nodes.set(node.id, node);
}

function addEdge(edges, edge) {
  if (!edge?.id || edges.has(edge.id)) return;
  edges.set(edge.id, edge);
}

function addTargetNode(nodes, target) {
  const id = targetNodeId(target);
  if (!id) return null;
  addNode(nodes, {
    id,
    type: target.target_type,
    target,
  });
  return id;
}

function projectTagAssertion(assertion, nodes, edges) {
  if (!assertion.active || !assertion.tag_id) return;
  const targetId = addTargetNode(nodes, assertion.target);
  if (!targetId) return;
  addNode(nodes, {
    id: assertion.tag_id,
    type: "tag_definition",
    tag_id: assertion.tag_id,
  });
  addEdge(edges, {
    id: `edge:${assertion.id}:tagged_as`,
    type: "tagged_as",
    from: targetId,
    to: assertion.tag_id,
    source: {
      source_type: "assertion",
      id: assertion.id,
    },
    assertion_id: assertion.id,
    visibility: assertion.visibility || "private",
    confidence: assertion.confidence ?? 1,
  });
}

function projectInterpretationAssertion(assertion, nodes, edges) {
  const targetId = addTargetNode(nodes, assertion.target);
  if (!targetId) return;
  const propositionTarget = assertion.proposition_target || assertion.proposition || null;
  const propositionId = targetNodeId(propositionTarget) || assertion.proposition_id;
  if (!propositionId) return;
  addNode(nodes, {
    id: propositionId,
    type: "interpretation_proposition",
    target: propositionTarget || undefined,
  });
  addEdge(edges, {
    id: `edge:${assertion.id}:supports_interpretation`,
    type: "supports_interpretation",
    from: targetId,
    to: propositionId,
    source: {
      source_type: "assertion",
      id: assertion.id,
    },
    assertion_id: assertion.id,
    visibility: assertion.visibility || "private",
    confidence: assertion.confidence ?? 1,
  });
}

export function projectAssertionsToSemanticGraph(assertions = {}) {
  const nodes = new Map();
  const edges = new Map();
  const activeAssertions = Object.values(assertions || {}).filter((assertion) => assertion?.active !== false);

  activeAssertions.forEach((assertion) => {
    if (assertion.assertion_type === "tag_application") projectTagAssertion(assertion, nodes, edges);
    if (assertion.assertion_type === "supports_interpretation") {
      projectInterpretationAssertion(assertion, nodes, edges);
    }
  });

  return {
    schema_version: 1,
    kind: "semantic_assertion_projection",
    generated_at: new Date().toISOString(),
    source: "local_assertion_store",
    counts: {
      assertions: activeAssertions.length,
      nodes: nodes.size,
      edges: edges.size,
    },
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
