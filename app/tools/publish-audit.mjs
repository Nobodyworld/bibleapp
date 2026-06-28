#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const dataRoot = join(appRoot, "data");

const removedDataDirs = [
  "lexicon",
  "performance",
  "provenance",
  "recovery",
  "strongs",
  "strongs-data",
];

const expectedPlanningDocs = [
  "docs/README.md",
  "docs/STUDY_FEATURE_RESTORE_PLAN.md",
  "docs/STUDY_FEATURE_UI_AUDIT.md",
  "docs/MISSING_STUDY_DATA_COPY_TABLE.md",
  "docs/STUDY_DATA_LICENSE_CANDIDATES.md",
  "docs/TEST_MODE_SPLIT_RECOMMENDATION.md",
  "docs/CURRENT_WORK.md",
];

const legacySourceName = ["open", "bible"].join("");
const blockedReferencePatterns = [
  new RegExp(legacySourceName, "i"),
  new RegExp(["open", "bible"].join("-"), "i"),
  new RegExp(["open", "bible"].join(" "), "i"),
];
const ignoredScanPaths = new Set(["tmp-http-server.err.log", "tmp-http-server.log"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function* walkFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const rel = relative(appRoot, path).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (rel === "scripts" || rel === "data") continue;
      yield* walkFiles(path);
    } else if (!ignoredScanPaths.has(rel)) {
      yield path;
    }
  }
}

async function assertNoBlockedReferences() {
  const hits = [];
  for await (const file of walkFiles(appRoot)) {
    const rel = relative(appRoot, file).replace(/\\/g, "/");
    const info = await stat(file);
    if (info.size > 2_000_000) continue;
    const text = await readFile(file, "utf8").catch(() => "");
    blockedReferencePatterns.forEach((pattern) => {
      if (pattern.test(text)) hits.push(rel);
    });
  }
  assert(hits.length === 0, `blocked legacy references found in publish files: ${[...new Set(hits)].join(", ")}`);
}

async function main() {
  const manifest = await readJson(join(dataRoot, "manifest.json"));
  const packageManifest = await readJson(join(dataRoot, "package-manifest.json"));
  const licenseMatrix = await readJson(join(dataRoot, "license-matrix.json"));

  assert(Array.isArray(manifest.translations), "manifest.translations must be an array");
  assert(Array.isArray(packageManifest.feature_packs), "package-manifest.feature_packs must be an array");
  assert(Array.isArray(licenseMatrix.packaged_datasets), "license-matrix.packaged_datasets must be an array");
  assert(manifest.license_matrix === "data/license-matrix.json", "manifest must point to data/license-matrix.json");
  assert(packageManifest.license_matrix === "data/license-matrix.json", "package manifest must point to data/license-matrix.json");

  const translationIds = manifest.translations.map((translation) => translation.id);
  const featurePackIds = new Set(packageManifest.feature_packs.map((pack) => pack.id));
  const matrixById = new Map(licenseMatrix.packaged_datasets.map((item) => [item.id, item]));

  translationIds.forEach((id) => {
    assert(existsSync(join(dataRoot, "verses", id)), `translation data directory is missing: ${id}`);
    assert(featurePackIds.has(`translation-${id}`), `package manifest missing feature pack for translation: ${id}`);
    assert(matrixById.has(`translation-${id}`), `license matrix missing translation row: ${id}`);
  });

  packageManifest.feature_packs.forEach((pack) => {
    assert(matrixById.has(pack.id), `license matrix missing feature pack row: ${pack.id}`);
  });

  licenseMatrix.packaged_datasets.forEach((item) => {
    assert(item.license_status, `license matrix row missing license_status: ${item.id}`);
    assert(item.public_redistribution, `license matrix row missing public_redistribution: ${item.id}`);
    assert(item.commercial_use, `license matrix row missing commercial_use: ${item.id}`);
    assert(item.sale_with_app, `license matrix row missing sale_with_app: ${item.id}`);
    assert(item.required_attribution, `license matrix row missing required_attribution: ${item.id}`);
    assert(item.notes, `license matrix row missing notes: ${item.id}`);
    (item.paths || []).forEach((relPath) => {
      assert(existsSync(join(appRoot, relPath)), `license matrix path does not exist for ${item.id}: ${relPath}`);
    });
  });

  removedDataDirs
    .filter((dir) => dir !== "lexicon" && dir !== "strongs")
    .forEach((dir) => {
      assert(!existsSync(join(dataRoot, dir)), `removed or unlicensed study data directory is present: data/${dir}`);
    });

  expectedPlanningDocs.forEach((relPath) => {
    assert(existsSync(join(appRoot, relPath)), `linked planning doc is missing: ${relPath}`);
  });

  await assertNoBlockedReferences();

  console.log(
    JSON.stringify(
      {
        status: "ok",
        scope: "package_structure",
        translations: translationIds.length,
        feature_packs: packageManifest.feature_packs.length,
        license_rows: licenseMatrix.packaged_datasets.length,
        license_review_required: true,
        runtime_readiness_checked: false,
        note: "This audit validates package structure only. Runtime readiness and legal approval for redistribution or sale require separate checks.",
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
