#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}

const [
  readme,
  notice,
  releaseChecklist,
  securityPolicy,
  sourceManifestText,
  packageManifestText,
  appManifestText,
] = await Promise.all([
  readText("README.md"),
  readText("NOTICE.md"),
  readText("PUBLIC_RELEASE_CHECKLIST.md"),
  readText("SECURITY.md"),
  readText("app/data/source-manifest.json"),
  readText("app/data/package-manifest.json"),
  readText("app/data/manifest.json"),
]);

const sourceManifest = JSON.parse(sourceManifestText);
const packageManifest = JSON.parse(packageManifestText);
const appManifest = JSON.parse(appManifestText);

assert.match(
  readme,
  /PUBLIC PREVIEW — ACTIVE DEVELOPMENT/,
  "README must expose the exact public-preview status",
);
assert.match(
  readme,
  /side-panel[\s\S]*Meaning[\s\S]*Study Marks[\s\S]*Processing[\s\S]*Study Data/i,
  "README must identify the evolving interface surfaces",
);
assert.match(
  readme,
  /does not promise a production release or stable API/i,
  "README must disclaim production-release and stable-API promises",
);
assert.match(
  readme,
  /Application code, tests, scripts, schemas, and tooling are MIT-licensed/i,
  "README must scope MIT licensing to application code and tooling",
);
assert.match(
  readme,
  /Bundled Bible and study data retains its own source rights and notices/i,
  "README must keep bundled-data rights distinct from the MIT code license",
);
assert.match(readme, /\[NOTICE\.md\]\(NOTICE\.md\)/, "README must link to NOTICE.md");
assert.match(
  readme,
  /app\/data\/source-manifest\.json/,
  "README must link to the bundled-data source manifest",
);

assert.match(
  notice,
  /Public repository visibility does not relicense bundled third-party data/i,
  "NOTICE must reject blanket relicensing through publication",
);
assert.match(
  notice,
  /app\/data\/source-manifest\.json/,
  "NOTICE must direct redistributors to the source manifest",
);
for (const retainedNotice of [
  "The Berean Bible (www.Berean.Bible) Berean Study Bible (BSB) © 2016, 2020 by Bible Hub and Berean.Bible. Used by Permission. All rights Reserved. Free downloads and licensing available.",
  "Text courtesy of BibleProtector.com. Section Headings Courtesy Berean Study Bible.",
  "This text of God's Word has been dedicated to the public domain. Free resources and databases are available at BereanBible.com.",
]) {
  assert.ok(notice.includes(retainedNotice), `NOTICE must retain source wording: ${retainedNotice}`);
}

assert.equal(sourceManifest.schema_version, 1, "source manifest schema must remain version 1");
assert.equal(
  sourceManifest.source_package?.classification,
  "OPENBIBLE_CONFIRMED",
  "reviewed source-package classification must remain intact",
);
assert.ok(sourceManifest.source_package?.archive_sha256, "source archive provenance hash is required");
assert.ok(Array.isArray(sourceManifest.exceptions) && sourceManifest.exceptions.length > 0, "source exceptions are required");
assert.ok(
  Array.isArray(sourceManifest.transformations) && sourceManifest.transformations.length > 0,
  "source transformations are required",
);
const sourceIds = new Set((sourceManifest.original_language_sources || []).map((source) => source.id));
for (const sourceId of ["wlc", "wlco", "nestle", "tr94"]) {
  assert.ok(sourceIds.has(sourceId), `source manifest must retain ${sourceId}`);
}

assert.equal(
  packageManifest.distribution,
  "source-notices-retained",
  "package inventory must retain its source-notice distribution classification",
);
assert.equal(
  packageManifest.source_manifest,
  "data/source-manifest.json",
  "package inventory must point to the source manifest",
);
assert.equal(
  appManifest.source_manifest,
  "data/source-manifest.json",
  "application manifest must point to the source manifest",
);
for (const [name, text] of [
  ["app/data/package-manifest.json", packageManifestText],
  ["app/data/manifest.json", appManifestText],
]) {
  assert.doesNotMatch(
    text,
    /"(?:license|rights|distribution)"\s*:\s*"(?:MIT|CC0|public domain)"/i,
    `${name} must not assign one blanket MIT, CC0, or public-domain label to the bundled package`,
  );
}

for (const heading of [
  "Phase A — Public Preview Visibility",
  "Phase B — Final Release or Tag Readiness",
  "Phase C — Post-Public GitHub Security Activation",
]) {
  assert.ok(releaseChecklist.includes(heading), `release checklist must include ${heading}`);
}
assert.match(
  releaseChecklist,
  /PR #24 remains draft and must not merge merely to publish the repository/i,
  "release checklist must preserve PR #24's draft hold",
);
assert.match(
  securityPolicy,
  /supported public-preview baseline is the current `main` branch/i,
  "security policy must identify the current main public-preview baseline",
);

console.log(
  JSON.stringify(
    {
      status: "ok",
      preview_status: "PUBLIC PREVIEW — ACTIVE DEVELOPMENT",
      original_language_sources: [...sourceIds].sort(),
      retained_notice_count: 3,
      activation_phases: 3,
    },
    null,
    2,
  ),
);
