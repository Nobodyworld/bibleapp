#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataRoot = join(appRoot, "data");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function normalizeBooks(requestedBooks, allBooks) {
  if (!requestedBooks) return allBooks;
  const set = new Set(allBooks);
  const books = requestedBooks
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => set.has(item));
  return [...new Set(books)];
}

function booksForChunk(books, chunkSize, chunkIndex) {
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) return books;
  const index = Number.isFinite(chunkIndex) ? Math.max(0, chunkIndex) : 0;
  const start = index * chunkSize;
  return books.slice(start, start + chunkSize);
}

function mapTokenSpans(verseText, rawTokens) {
  const spans = [];
  let cursor = 0;
  const text = String(verseText || "");
  (rawTokens || []).forEach((raw) => {
    const strongTokenIndex = raw?.[0] ?? null;
    const english = String(raw?.[1] || "").trim();
    if (!english) return;
    let start = text.indexOf(english, cursor);
    if (start < 0) start = text.indexOf(english);
    if (start < 0) return;
    const end = start + english.length;
    if (spans.some((span) => start < span[3] && end > span[2])) return;
    spans.push([strongTokenIndex, strongTokenIndex, start, end, raw?.[3] || null, raw?.[2] || null]);
    cursor = end;
  });
  return spans;
}

function generateWordMapBook({ translationId, bookId, generatedAt }) {
  const versePath = join(dataRoot, "verses", translationId, `${bookId}.json`);
  const strongsPath = join(dataRoot, "strongs", translationId, "books", `${bookId}.json`);
  if (!existsSync(versePath) || !existsSync(strongsPath)) return null;

  const verseBook = readJson(versePath);
  const strongsBook = readJson(strongsPath);
  const chapters = {};

  Object.keys(verseBook?.chapters || {})
    .sort((a, b) => Number(a) - Number(b))
    .forEach((chapter) => {
      const verseRows = {};
      const verses = verseBook.chapters?.[chapter] || {};
      Object.keys(verses)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((verse) => {
          const spans = mapTokenSpans(verses[verse], strongsBook?.chapters?.[chapter]?.[verse] || []);
          if (spans.length) verseRows[verse] = spans;
        });
      if (Object.keys(verseRows).length) chapters[chapter] = verseRows;
    });

  return {
    schema_version: 1,
    generated_at: generatedAt,
    source: {
      verse_path: `data/verses/${translationId}/${bookId}.json`,
      strongs_path: `data/strongs/${translationId}/books/${bookId}.json`,
    },
    span_schema: ["strong_token_index", "source_token_index", "start_offset", "end_offset", "strong_code", "language"],
    book: verseBook.book || { id: bookId },
    chapters,
  };
}

function generateGraphBook({ bookId, generatedAt, bookMeta }) {
  const crossPath = join(dataRoot, "crossrefs", `${bookId}.json`);
  if (!existsSync(crossPath)) return null;
  const crossrefs = readJson(crossPath);
  const edgeCounts = new Map();

  Object.values(crossrefs?.verses || {}).forEach((entry) => {
    [...(entry?.cross_references || []), ...(entry?.treasury || [])].forEach((target) => {
      const targetBookId = target?.book_id;
      if (!targetBookId) return;
      edgeCounts.set(targetBookId, (edgeCounts.get(targetBookId) || 0) + 1);
    });
  });

  return {
    schema_version: 1,
    generated_at: generatedAt,
    source: { crossrefs_path: `data/crossrefs/${bookId}.json` },
    book: {
      id: bookMeta?.id || bookId,
      name: bookMeta?.name || bookId,
      osis: bookMeta?.osis || null,
    },
    verse_count: Object.keys(crossrefs?.verses || {}).length,
    edge_count: [...edgeCounts.values()].reduce((sum, count) => sum + count, 0),
    outbound_edges: [...edgeCounts.entries()]
      .map(([target_book_id, count]) => ({ target_book_id, count }))
      .sort((a, b) => b.count - a.count || a.target_book_id.localeCompare(b.target_book_id)),
  };
}

function main() {
  const { values } = parseArgs({
    options: {
      books: { type: "string" },
      "chunk-size": { type: "string" },
      "chunk-index": { type: "string" },
      translation: { type: "string", default: "bsb" },
    },
  });

  const manifest = readJson(join(dataRoot, "manifest.json"));
  const allBookIds = (manifest?.books || []).map((book) => book.id);
  const chunkSize = values["chunk-size"] ? Number(values["chunk-size"]) : null;
  const chunkIndex = values["chunk-index"] ? Number(values["chunk-index"]) : 0;
  const requested = normalizeBooks(values.books, allBookIds);
  const selectedBooks = booksForChunk(requested, chunkSize, chunkIndex);
  const generatedAt = new Date().toISOString();
  const booksById = new Map((manifest?.books || []).map((book) => [book.id, book]));

  const wordMapRoot = join(dataRoot, "analysis", "word-map", values.translation);
  const graphRoot = join(dataRoot, "analysis", "graph", "books");
  mkdirSync(wordMapRoot, { recursive: true });
  mkdirSync(graphRoot, { recursive: true });

  let wordMapBooks = 0;
  let graphBooks = 0;
  const graphTotals = new Map();

  selectedBooks.forEach((bookId) => {
    const wordMapBook = generateWordMapBook({ translationId: values.translation, bookId, generatedAt });
    if (wordMapBook) {
      writeJson(join(wordMapRoot, `${bookId}.json`), wordMapBook);
      wordMapBooks += 1;
    }

    const graphBook = generateGraphBook({ bookId, generatedAt, bookMeta: booksById.get(bookId) });
    if (graphBook) {
      writeJson(join(graphRoot, `${bookId}.json`), graphBook);
      graphBook.outbound_edges.forEach((edge) => {
        const key = `${bookId}->${edge.target_book_id}`;
        graphTotals.set(key, (graphTotals.get(key) || 0) + Number(edge.count || 0));
      });
      graphBooks += 1;
    }
  });

  const graphSummary = {
    schema_version: 1,
    generated_at: generatedAt,
    books_processed: selectedBooks.length,
    top_edges: [...graphTotals.entries()]
      .map(([key, count]) => {
        const [source_book_id, target_book_id] = key.split("->");
        return { source_book_id, target_book_id, count };
      })
      .sort((a, b) => b.count - a.count || a.source_book_id.localeCompare(b.source_book_id))
      .slice(0, 200),
  };

  const analysisManifest = {
    schema_version: 1,
    generated_at: generatedAt,
    generator: "tools/generate-analysis-packs.mjs",
    parameters: {
      translation: values.translation,
      books: selectedBooks,
      chunk_size: chunkSize,
      chunk_index: chunkIndex,
    },
    outputs: {
      word_map_books: wordMapBooks,
      graph_books: graphBooks,
      word_map_root: `data/analysis/word-map/${values.translation}`,
      graph_root: "data/analysis/graph/books",
      graph_summary: "data/analysis/graph/summary.json",
    },
  };

  writeJson(join(dataRoot, "analysis", "manifest.json"), analysisManifest);
  writeJson(join(dataRoot, "analysis", "graph", "summary.json"), graphSummary);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        selected_books: selectedBooks.length,
        word_map_books: wordMapBooks,
        graph_books: graphBooks,
        chunk_size: chunkSize,
        chunk_index: chunkIndex,
      },
      null,
      2,
    ),
  );
}

main();
