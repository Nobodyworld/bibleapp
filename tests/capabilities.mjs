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
    const satisfied = cap.requires.every((pack) => installedPacks.includes(pack));
    capabilities.push({
      id: cap.id,
      name: cap.name,
      available: satisfied,
      requires: cap.requires,
    });
  }

  return capabilities;
}

const packageManifest = readJson(join(dataRoot, "package-manifest.json"));
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
