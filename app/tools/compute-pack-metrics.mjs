#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataRoot = join(appRoot, "data");

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function walkDir(dir) {
  const files = [];
  if (!existsSync(dir)) return files;

  function walk(path) {
    const entries = readdirSync(path);
    for (const entry of entries) {
      const fullPath = join(path, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function computePackMetrics(packId, packPaths) {
  let totalBytes = 0;
  let fileCount = 0;
  let gzipBytes = 0;

  for (const packPath of packPaths) {
    const files = walkDir(packPath);
    fileCount += files.length;

    for (const file of files) {
      const content = readFileSync(file);
      totalBytes += content.length;
      gzipBytes += gzipSync(content).length;
    }
  }

  return {
    files: fileCount,
    bytes: totalBytes,
    gzip_bytes: gzipBytes,
  };
}

// Define pack-to-path mappings
const packPaths = {
  books: [],
  crossrefs: [join(dataRoot, "crossrefs")],
  commentary: [join(dataRoot, "commentaries")],
  outlines: [join(dataRoot, "outlines")],
  "interlinear-bsb": [join(dataRoot, "interlinear")],
  "interlinear-overlays": [join(dataRoot, "strongs-overlay")],
  "search-verses": [join(dataRoot, "search", "generated", "verses")],
  "search-lexicon": [join(dataRoot, "search", "generated", "lexicon")],
  "search-outlines": [join(dataRoot, "search", "generated", "outlines")],
  "search-commentaries": [join(dataRoot, "search", "generated", "commentaries")],
  "lexicon-metadata": [join(dataRoot, "language")],
  "language-hebrew": [join(dataRoot, "language", "hebrew")],
  "language-greek": [join(dataRoot, "language", "greek")],
  "analysis-word-map": [join(dataRoot, "analysis", "word-map")],
  "analysis-graph": [join(dataRoot, "analysis", "graph")],
};

const manifest = readJson(join(dataRoot, "package-manifest.json"));

// Update metrics for each pack
for (const pack of manifest.feature_packs) {
  const paths = packPaths[pack.id] || [];
  if (paths.length > 0) {
    const metrics = computePackMetrics(pack.id, paths);
    pack.files = metrics.files;
    pack.bytes = metrics.bytes;
    pack.gzip_bytes = metrics.gzip_bytes;
    console.log(`${pack.id}: ${metrics.files} files, ${metrics.bytes} bytes, ${metrics.gzip_bytes} gzip`);
  }
}

writeJson(join(dataRoot, "package-manifest.json"), manifest);
console.log("Updated package-manifest.json with computed metrics");
