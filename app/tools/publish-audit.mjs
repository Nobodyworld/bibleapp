#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const dataRoot = join(appRoot, "data");
const expectedArchiveSha256 = "5873f5a28ceb3cb760cc0dcaa9b9d28ffaf00595bad0c424b60c7f1ad56283fe";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const manifest = await readJson(join(dataRoot, "manifest.json"));
  const packageManifest = await readJson(join(dataRoot, "package-manifest.json"));
  const sourceManifest = await readJson(join(dataRoot, "source-manifest.json"));

  assert(Array.isArray(manifest.translations), "manifest.translations must be an array");
  assert(Array.isArray(packageManifest.feature_packs), "package-manifest.feature_packs must be an array");
  assert(sourceManifest.schema_version === 1, "source-manifest.schema_version must be 1");
  assert(
    sourceManifest.source_package?.classification === "OPENBIBLE_CONFIRMED",
    "source package classification must be OPENBIBLE_CONFIRMED",
  );
  assert(
    sourceManifest.source_package?.archive_sha256 === expectedArchiveSha256,
    "source package archive hash does not match the reviewed archive",
  );
  assert(Array.isArray(sourceManifest.exceptions), "source-manifest.exceptions must be an array");
  assert(Array.isArray(sourceManifest.transformations), "source-manifest.transformations must be an array");
  assert(manifest.source_manifest === "data/source-manifest.json", "manifest must point to data/source-manifest.json");
  assert(
    packageManifest.source_manifest === "data/source-manifest.json",
    "package manifest must point to data/source-manifest.json",
  );

  const featurePackIds = new Set(packageManifest.feature_packs.map((pack) => pack.id));
  manifest.translations.forEach(({ id }) => {
    assert(existsSync(join(dataRoot, "verses", id)), `translation data directory is missing: ${id}`);
    assert(featurePackIds.has(`translation-${id}`), `package manifest missing translation pack: ${id}`);
  });

  packageManifest.feature_packs.forEach((pack) => {
    (pack.paths || []).forEach((path) => {
      assert(existsSync(join(appRoot, path)), `feature pack path does not exist for ${pack.id}: ${path}`);
    });
  });

  console.log(
    JSON.stringify(
      {
        status: "ok",
        scope: "public_package_structure",
        source_classification: sourceManifest.source_package.classification,
        translations: manifest.translations.length,
        feature_packs: packageManifest.feature_packs.length,
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
