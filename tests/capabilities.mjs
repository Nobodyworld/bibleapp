#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const appRoot = join(repoRoot, "app");
const dataRoot = join(appRoot, "data");

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function resolveCapabilities(packageManifest) {
  const installedPacks = packageManifest.packages[0]?.feature_pack_ids || [];
  const packDefinitions = new Map(
    (packageManifest.feature_packs || []).map((pack) => [pack.id, pack]),
  );
  const capabilities = [];

  const capabilityDefs = [
    {
      id: "reader",
      name: "Bible Reader",
      requires: ["translation-bsb"],
    },
    {
      id: "search-verses",
      name: "Search (Verses)",
      requires: ["search-verses"],
    },
    {
      id: "crossrefs",
      name: "Cross References",
      requires: ["crossrefs-basic"],
    },
    {
      id: "commentary",
      name: "Commentary",
      requires: ["commentary-verse-index"],
    },
    {
      id: "outlines",
      name: "Outlines",
      requires: ["outlines"],
    },
    {
      id: "interlinear",
      name: "Interlinear",
      requires: ["hebrew-interlinear", "greek-interlinear"],
    },
    {
      id: "lexicon-metadata",
      name: "Lexicon Metadata",
      requires: ["hebrew-lexicon", "greek-lexicon"],
    },
    {
      id: "graph-word-map-analysis",
      name: "Graph & Word-Map Analysis",
      requires: ["analysis-word-map", "analysis-graph"],
    },
  ];

  for (const cap of capabilityDefs) {
    const issues = [];
    const checked = new Set();

    function validatePack(packId) {
      if (checked.has(packId)) return;
      checked.add(packId);
      if (!installedPacks.includes(packId)) {
        issues.push(`not installed: ${packId}`);
        return;
      }
      const definition = packDefinitions.get(packId);
      if (!definition) {
        issues.push(`missing definition: ${packId}`);
        return;
      }
      for (const path of definition.paths || []) {
        if (!existsSync(join(appRoot, path))) issues.push(`missing path: ${path}`);
      }
      for (const dependency of definition.dependencies || []) validatePack(dependency);
    }

    cap.requires.forEach(validatePack);
    capabilities.push({
      id: cap.id,
      name: cap.name,
      available: issues.length === 0,
      requires: cap.requires,
      issues,
    });
  }

  return capabilities;
}

const packageManifest = readJson(join(dataRoot, "package-manifest.json"));
if (!packageManifest?.packages?.length || !Array.isArray(packageManifest.feature_packs)) {
  throw new Error("package-manifest.json is missing packages or feature_packs");
}
const capabilities = resolveCapabilities(packageManifest);

const results = {
  total: capabilities.length,
  available: capabilities.filter((c) => c.available).length,
  unavailable: capabilities.filter((c) => !c.available).length,
  capabilities,
};

console.log(JSON.stringify(results, null, 2));

if (results.unavailable > 0) {
  process.exit(1);
}
