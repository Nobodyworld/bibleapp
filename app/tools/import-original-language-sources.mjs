#!/usr/bin/env node

import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DATA_ROOT = resolve(HERE, "..", "data");
const HEBREW_PATTERN = /[\u0590-\u05ff]/u;
const GREEK_PATTERN = /[\u0370-\u03ff\u1f00-\u1fff]/u;

export const SOURCE_DEFINITIONS = Object.freeze({
  wlc: {
    code: "WLC",
    name: "Westminster Leningrad Codex",
    language: "hebrew",
    testament: "old",
  },
  wlco: {
    code: "WLCO",
    name: "WLC — Consonants Only",
    language: "hebrew",
    testament: "old",
  },
  nestle: {
    code: "Nestle 1904",
    name: "Nestle Greek New Testament 1904",
    language: "greek",
    testament: "new",
  },
  tr94: {
    code: "TR94",
    name: "Scrivener’s Textus Receptus 1894",
    language: "greek",
    testament: "new",
  },
});

const BOOK_ALIASES = Object.freeze({
  canticles: "songs",
  psalm: "psalms",
  song: "songs",
  song_of_songs: "songs",
});

const NAMED_ENTITIES = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
});

export function canonicalBookId(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return BOOK_ALIASES[normalized] || normalized;
}

export function decodeHtmlEntities(value) {
  return String(value || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, key) => {
    if (key[0] === "#") {
      const hexadecimal = key[1]?.toLowerCase() === "x";
      const number = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
    }
    return NAMED_ENTITIES[key.toLowerCase()] ?? entity;
  });
}

function htmlToSourceText(fragment) {
  return decodeHtmlEntities(String(fragment || "").replace(/<[^>]+>/g, " "))
    .replace(/[\u200e\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

function hasExpectedScript(text, language) {
  return language === "hebrew" ? HEBREW_PATTERN.test(text) : GREEK_PATTERN.test(text);
}

export function extractChapterVerses(html, language) {
  if (language !== "hebrew" && language !== "greek") throw new Error(`Unsupported language: ${language}`);
  const paragraphClass = language === "hebrew" ? "hebrew" : "greek";
  const paragraphPattern = new RegExp(
    `<p\\b[^>]*class=["'][^"']*\\b${paragraphClass}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/p>`,
    "gi",
  );
  const markerPattern = /<span\b[^>]*class=["'][^"']*\breftext\b[^"']*["'][^>]*>[\s\S]*?<b\b[^>]*>(\d+)<\/b>[\s\S]*?<\/span>/gi;
  const verses = {};
  const duplicates = [];
  const emptyReferences = [];

  for (const paragraphMatch of String(html || "").matchAll(paragraphPattern)) {
    const paragraph = paragraphMatch[1];
    const markers = [...paragraph.matchAll(markerPattern)];
    for (let index = 0; index < markers.length; index += 1) {
      const marker = markers[index];
      const verse = String(Number(marker[1]));
      const start = (marker.index || 0) + marker[0].length;
      const end = index + 1 < markers.length ? markers[index + 1].index : paragraph.length;
      const text = htmlToSourceText(paragraph.slice(start, end));
      if (!text || !hasExpectedScript(text, language)) {
        emptyReferences.push(verse);
        continue;
      }
      if (Object.hasOwn(verses, verse)) duplicates.push(verse);
      else verses[verse] = text;
    }
  }

  return { verses, duplicates, emptyReferences };
}

function numericEntries(object) {
  return Object.entries(object).sort((left, right) => Number(left[0]) - Number(right[0]));
}

export function stableBookJson(payload) {
  const chapters = {};
  for (const [chapter, verses] of numericEntries(payload.chapters || {})) {
    chapters[chapter] = Object.fromEntries(numericEntries(verses));
  }
  return `${JSON.stringify({ book: payload.book, chapters, translation: payload.translation })}\n`;
}

function parseArgs(argv) {
  const args = { check: false, outputRoot: join(APP_DATA_ROOT, "verses") };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--check") args.check = true;
    else if (value === "--archive-root") args.archiveRoot = argv[++index];
    else if (value === "--output-root") args.outputRoot = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!args.archiveRoot) throw new Error("--archive-root is required");
  return args;
}

async function fileNames(path) {
  try {
    return (await readdir(path, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function findSourceBookDirectory(sourceRoot, bookId) {
  const candidates = [bookId, ...Object.entries(BOOK_ALIASES).filter(([, canonical]) => canonical === bookId).map(([alias]) => alias)];
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const directories = new Map(entries.filter((entry) => entry.isDirectory()).map((entry) => [canonicalBookId(entry.name), entry.name]));
  const match = candidates.map(canonicalBookId).find((candidate) => directories.has(candidate));
  return match ? join(sourceRoot, directories.get(match)) : null;
}

export async function generateSourceCorpus({ archiveRoot, outputRoot, check = false, manifestPath = join(APP_DATA_ROOT, "manifest.json") }) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const oldTestamentIds = new Set(manifest.books.slice(0, 39).map((book) => book.id));
  const newTestamentIds = new Set(manifest.books.slice(39).map((book) => book.id));
  const summaries = [];
  let mismatches = 0;

  for (const [sourceId, definition] of Object.entries(SOURCE_DEFINITIONS)) {
    const sourceRoot = resolve(archiveRoot, sourceId);
    const allowedBooks = definition.testament === "old" ? oldTestamentIds : newTestamentIds;
    const summary = {
      source_id: sourceId,
      books_generated: 0,
      chapters_generated: 0,
      verses_generated: 0,
      skipped_files: 0,
      malformed_files: 0,
      duplicate_references: 0,
      empty_references: 0,
      duplicate_reference_samples: [],
      empty_reference_samples: [],
      malformed_file_samples: [],
      sample_references: [],
    };

    for (const book of manifest.books) {
      if (!allowedBooks.has(book.id)) continue;
      const bookDirectory = await findSourceBookDirectory(sourceRoot, book.id);
      if (!bookDirectory) {
        summary.skipped_files += 1;
        continue;
      }
      const chapterFiles = (await fileNames(bookDirectory))
        .filter((name) => /^\d+\.html?$/i.test(name))
        .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));
      const chapters = {};

      for (const name of chapterFiles) {
        const chapter = String(Number.parseInt(name, 10));
        try {
          const parsed = extractChapterVerses(await readFile(join(bookDirectory, name), "utf8"), definition.language);
          summary.duplicate_references += parsed.duplicates.length;
          summary.empty_references += parsed.emptyReferences.length;
          for (const verse of parsed.duplicates) {
            if (summary.duplicate_reference_samples.length < 20) {
              summary.duplicate_reference_samples.push(`${book.id} ${chapter}:${verse}`);
            }
          }
          for (const verse of parsed.emptyReferences) {
            if (summary.empty_reference_samples.length < 20) {
              summary.empty_reference_samples.push(`${book.id} ${chapter}:${verse}`);
            }
          }
          if (Object.keys(parsed.verses).length) {
            chapters[chapter] = parsed.verses;
            summary.chapters_generated += 1;
            summary.verses_generated += Object.keys(parsed.verses).length;
            if (summary.sample_references.length < 3) {
              summary.sample_references.push(`${book.id} ${chapter}:${Object.keys(parsed.verses)[0]}`);
            }
          } else {
            summary.skipped_files += 1;
          }
        } catch {
          summary.malformed_files += 1;
          if (summary.malformed_file_samples.length < 20) summary.malformed_file_samples.push(`${book.id}/${name}`);
        }
      }

      if (!Object.keys(chapters).length) continue;
      summary.books_generated += 1;
      const content = stableBookJson({
        book,
        chapters,
        translation: { id: sourceId, code: definition.code, name: definition.name },
      });
      const outputPath = resolve(outputRoot, sourceId, `${book.id}.json`);
      if (check) {
        let current = "";
        try {
          current = await readFile(outputPath, "utf8");
        } catch {
          // Count a missing output as a mismatch.
        }
        if (current !== content) mismatches += 1;
      } else {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, content, "utf8");
      }
    }
    summaries.push(summary);
  }

  return { check, mismatches, sources: summaries };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await generateSourceCorpus({
    archiveRoot: resolve(args.archiveRoot),
    outputRoot: resolve(args.outputRoot),
    check: args.check,
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.mismatches || result.sources.some((source) => source.malformed_files || source.duplicate_references)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
