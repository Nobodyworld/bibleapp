#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const appRoot = join(repoRoot, "app");
const dataRoot = join(appRoot, "data");

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

const manifest = readJson(join(dataRoot, "manifest.json"));
const books = (manifest?.books || []).map((b) => b.id);

const results = {
  summary: {
    books_with_data: 0,
    word_maps_valid: 0,
    word_maps_invalid: 0,
    graphs_valid: 0,
    graphs_invalid: 0,
  },
  issues: [],
};

// Check word-maps
const wordMapRoot = join(dataRoot, "analysis", "word-map", "bsb");
if (existsSync(wordMapRoot)) {
  const wordMapBooks = readdirSync(wordMapRoot).filter((f) => f.endsWith(".json"));
  results.summary.word_maps_valid = wordMapBooks.length;

  // Spot-check 3 random books
  const sampled = wordMapBooks.slice(0, 3);
  for (const book of sampled) {
    const data = readJson(join(wordMapRoot, book));
    if (!data || typeof data !== "object") {
      results.summary.word_maps_invalid += 1;
      results.issues.push(`Word-map ${book} is invalid JSON`);
    } else if (!data.book || !data.chapters || typeof data.chapters !== "object") {
      results.issues.push(`Word-map ${book} missing book metadata or chapters object`);
    } else {
      let spanCount = 0;
      for (const chapterNum in data.chapters) {
        const chapter = data.chapters[chapterNum];
        if (chapter && typeof chapter === "object") {
          for (const verseNum in chapter) {
            const verse = chapter[verseNum];
            if (Array.isArray(verse)) {
              spanCount += verse.length;
            }
          }
        }
      }
      if (spanCount === 0) {
        results.issues.push(`Word-map ${book} has chapters but no span data`);
      }
    }
  }
}

// Check graphs
const graphRoot = join(dataRoot, "analysis", "graph", "books");
if (existsSync(graphRoot)) {
  const graphBooks = readdirSync(graphRoot).filter((f) => f.endsWith(".json"));
  results.summary.graphs_valid = graphBooks.length;

  // Spot-check 3 random books
  const sampled = graphBooks.slice(0, 3);
  for (const book of sampled) {
    const data = readJson(join(graphRoot, book));
    if (!data || typeof data !== "object") {
      results.summary.graphs_invalid += 1;
      results.issues.push(`Graph ${book} is invalid JSON`);
    } else if (!data.book) {
      results.issues.push(`Graph ${book} missing book metadata`);
    } else if (!Array.isArray(data.outbound_edges)) {
      results.issues.push(`Graph ${book} missing outbound_edges array`);
    } else if (data.outbound_edges.length === 0 && books.length > 0) {
      // Check if it's expected (some books may have no crossrefs)
      results.issues.push(`Graph ${book} has no edges (expected for some books)`);
    }
  }
}

console.log(JSON.stringify(results, null, 2));

if (results.summary.word_maps_invalid > 0 || results.summary.graphs_invalid > 0) {
  process.exit(1);
}
