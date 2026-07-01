#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const trackerPath = fileURLToPath(new URL("../MASTER_STATUS_TRACKER.md", import.meta.url));
const tracker = await readFile(trackerPath, "utf8");
const packageJson = JSON.parse(await readFile(`${root}/package.json`, "utf8"));

const sourcePlans = [
  "FULL_APP_HEALTH_AUDIT.md",
  "CURRENT_WORK.md",
  "TAG_FAVORITES_ANALYSIS_ROADMAP.md",
  "UI_FUNCTIONALITY_SCHEMA.md",
  "VISUAL_REVIEW_SUMMARY.md",
  "APP_IMPROVEMENT_ANALYSIS.md",
  "STUDY_FEATURE_RESTORE_PLAN.md",
  "STUDY_FEATURE_UI_AUDIT.md",
  "STUDY_DATA_LICENSE_CANDIDATES.md",
  "MISSING_STUDY_DATA_COPY_TABLE.md",
  "TEST_MODE_SPLIT_RECOMMENDATION.md",
];

const planningDocs = (await readdir(`${root}/app/docs`))
  .filter((name) => name.endsWith(".md") && name !== "README.md")
  .sort();
assert.deepEqual(
  [...sourcePlans].sort(),
  planningDocs,
  "Every detailed app/docs planning or contract document must be classified in the master tracker test.",
);

for (const source of sourcePlans) {
  assert(tracker.includes(source), `Master tracker must register ${source}.`);
}

const allowedStatuses = new Set([
  "Complete",
  "Partial",
  "Blocked",
  "Planned",
  "Future",
  "Ongoing",
  "Superseded",
]);
const taskRows = [...tracker.matchAll(/^\|\s*([A-Z0-9]+-\d{3})\s*\|([^|]+)\|\s*([^|]+)\|([^|]+)\|([^|]+)\|$/gm)];
assert(taskRows.length >= 100, `Expected at least 100 consolidated tasks, found ${taskRows.length}.`);

const ids = new Set();
const statusCounts = {};
for (const [, id, task, rawStatus, evidence, source] of taskRows) {
  const status = rawStatus.trim();
  assert(!ids.has(id), `Duplicate master task ID: ${id}.`);
  ids.add(id);
  assert(allowedStatuses.has(status), `Unknown status "${status}" on ${id}.`);
  assert(task.trim().length >= 8, `${id} needs a concrete task description.`);
  assert(evidence.trim().length >= 8, `${id} needs evidence or a next action.`);
  assert(source.trim().length >= 3, `${id} needs a source.`);
  statusCounts[status] = (statusCounts[status] || 0) + 1;
}

for (const required of allowedStatuses) {
  assert(statusCounts[required] > 0, `Master tracker must use status ${required}.`);
  const summaryMatch = tracker.match(new RegExp(`^\\| ${required} \\| (\\d+) \\|$`, "m"));
  assert(summaryMatch, `Master tracker summary must include ${required}.`);
  assert.equal(
    Number(summaryMatch[1]),
    statusCounts[required],
    `Master tracker summary count is stale for ${required}.`,
  );
}
const totalMatch = tracker.match(/^\| \*\*Total\*\* \| \*\*(\d+)\*\* \|$/m);
assert(totalMatch, "Master tracker summary must include a total.");
assert.equal(Number(totalMatch[1]), taskRows.length, "Master tracker summary total is stale.");

assert(
  packageJson.scripts["test:static"]?.includes("master-status-tracker.mjs"),
  "Master tracker validation must run in test:static.",
);

console.log(
  JSON.stringify(
    {
      status: "ok",
      source_plans: sourcePlans.length,
      tasks: taskRows.length,
      status_counts: statusCounts,
    },
    null,
    2,
  ),
);
