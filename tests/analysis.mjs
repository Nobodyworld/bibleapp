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
const validWordMapBooks = new Set();
const validGraphBooks = new Set();

const wordMapRoot = join(dataRoot, "analysis", "word-map", "bsb");
if (existsSync(wordMapRoot)) {
  const wordMapBooks = readdirSync(wordMapRoot).filter((f) => f.endsWith(".json"));
  for (const file of wordMapBooks) {
    const bookId = file.slice(0, -5);
    let data;
    try {
      data = readJson(join(wordMapRoot, file));
    } catch (error) {
      results.summary.word_maps_invalid += 1;
      results.issues.push(`Word-map ${file} is invalid JSON: ${error.message}`);
      continue;
    }

    let valid = Boolean(
      data &&
      typeof data === "object" &&
      data.book?.id === bookId &&
      data.chapters &&
      typeof data.chapters === "object" &&
      !Array.isArray(data.chapters),
    );
    let spanCount = 0;

    if (valid) {
      for (const chapter of Object.values(data.chapters)) {
        if (!chapter || typeof chapter !== "object" || Array.isArray(chapter)) {
          valid = false;
          break;
        }
        for (const spans of Object.values(chapter)) {
          if (!Array.isArray(spans)) {
            valid = false;
            break;
          }
          for (const span of spans) {
            if (
              !Array.isArray(span) ||
              span.length < 6 ||
              !Number.isInteger(span[2]) ||
              !Number.isInteger(span[3]) ||
              span[2] < 0 ||
              span[3] < span[2] ||
              !["hebrew", "greek"].includes(span[5])
            ) {
              valid = false;
              break;
            }
            spanCount += 1;
          }
          if (!valid) break;
        }
        if (!valid) break;
      }
    }

    valid = valid && spanCount > 0;
    if (valid) {
      results.summary.word_maps_valid += 1;
      validWordMapBooks.add(bookId);
    } else {
      results.summary.word_maps_invalid += 1;
      results.issues.push(`Word-map ${file} has invalid metadata, chapter data, or spans`);
    }
  }
}

const graphRoot = join(dataRoot, "analysis", "graph", "books");
if (existsSync(graphRoot)) {
  const graphBooks = readdirSync(graphRoot).filter((f) => f.endsWith(".json"));
  const knownBooks = new Set(books);
  for (const file of graphBooks) {
    const bookId = file.slice(0, -5);
    let data;
    try {
      data = readJson(join(graphRoot, file));
    } catch (error) {
      results.summary.graphs_invalid += 1;
      results.issues.push(`Graph ${file} is invalid JSON: ${error.message}`);
      continue;
    }

    const edgesValid =
      Array.isArray(data?.outbound_edges) &&
      data.outbound_edges.every(
        (edge) =>
          knownBooks.has(edge?.target_book_id) &&
          Number.isInteger(edge?.count) &&
          edge.count >= 0,
      );
    const edgeTotal = Array.isArray(data?.outbound_edges)
      ? data.outbound_edges.reduce((total, edge) => total + (edge.count || 0), 0)
      : -1;
    const valid =
      data?.book?.id === bookId &&
      Number.isInteger(data?.verse_count) &&
      data.verse_count > 0 &&
      Number.isInteger(data?.edge_count) &&
      data.edge_count >= 0 &&
      edgesValid &&
      edgeTotal === data.edge_count;

    if (valid) {
      results.summary.graphs_valid += 1;
      validGraphBooks.add(bookId);
    } else {
      results.summary.graphs_invalid += 1;
      results.issues.push(`Graph ${file} has invalid metadata, counts, or outbound edges`);
    }
  }
}

results.summary.books_with_data = books.filter(
  (bookId) => validWordMapBooks.has(bookId) && validGraphBooks.has(bookId),
).length;

console.log(JSON.stringify(results, null, 2));

if (results.summary.word_maps_invalid > 0 || results.summary.graphs_invalid > 0) {
  process.exit(1);
}
