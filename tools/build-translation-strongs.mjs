#!/usr/bin/env node
// Build Strong's overlay + word-map data for KJV and YLT from the backup
// openbible Strong's-tagged HTML (kjvs / ylts). Output matches the BSB schema so
// the reader and translation-renderings panel can use them like BSB.
//
//   strongs/<tr>/books/<book>.json        (BSB overlay schema)
//   analysis/word-map/<tr>/<book>.json    (word-map schema)
//
// English renderings are aligned to the EXISTING app verse text
// (app/data/verses/<tr>/<book>.json) so substring matching in the reader works.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APP_DATA = path.join(ROOT, "app", "data");
const BACKUP = path.join(ROOT, "backup", "archive-2026-06-20", "openbible");

const TRANSLATIONS = [
    { id: "kjv", srcDir: "kjvs" },
    { id: "ylt", srcDir: "ylts" },
];

function decodeEntities(value) {
    return String(value)
        .replace(/&#8217;|&#8216;|&#x2019;|&#x2018;/g, "'")
        .replace(/&#8220;|&#8221;|&#x201c;|&#x201d;/gi, '"')
        .replace(/&#8212;|&#x2014;/gi, "--")
        .replace(/&#8211;|&#x2013;/gi, "-")
        .replace(/&#8201;|&#8202;|&#160;|&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(value) {
    return String(value).replace(/<[^>]+>/g, "");
}

// 1:1 character normalization (no length change) for matching.
function normChar(ch) {
    if (ch === "\u2019" || ch === "\u2018" || ch === "`") return "'";
    if (ch === "\u201C" || ch === "\u201D") return '"';
    if (ch === "\u2014" || ch === "\u2013") return "-";
    return ch.toLowerCase();
}

// Build a whitespace-collapsed, normalized version of the verse text together
// with a map from each normalized index back to the original string index.
function buildNorm(text) {
    const chars = [];
    const map = [];
    let prevSpace = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (/\s/.test(c)) {
            if (!prevSpace && chars.length) {
                chars.push(" ");
                map.push(i);
                prevSpace = true;
            }
            continue;
        }
        prevSpace = false;
        chars.push(normChar(c));
        map.push(i);
    }
    while (chars.length && chars[chars.length - 1] === " ") {
        chars.pop();
        map.pop();
    }
    return { norm: chars.join(""), map };
}

// Normalize an anchor's text into a matchable needle (collapse ws, transform,
// strip surrounding punctuation but keep internal apostrophes/hyphens).
function normNeedle(raw) {
    let s = decodeEntities(stripTags(raw));
    s = s
        .replace(/[\u2019\u2018`]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2014\u2013]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    s = s.replace(/^[^a-z0-9]+/i, "").replace(/[^a-z0-9]+$/i, "");
    return s;
}

function parseTitle(title) {
    const t = decodeEntities(title).trim();
    const noNum = t.replace(/^\d+\.?\s*/, "");
    let original = noNum;
    let gloss = "";
    const dash = noNum.indexOf(" -- ");
    if (dash >= 0) {
        gloss = noNum.slice(dash + 4).trim();
        original = noNum.slice(0, dash).trim();
    }
    const paren = original.indexOf("(");
    if (paren >= 0) original = original.slice(0, paren).trim();
    return { original, morphology: "", gloss };
}

const VERSE_MARKER = /<span class="reftext"><a[^>]*><b>(\d+)[a-z]?<\/b><\/a><\/span>/gi;
// Strong's anchors in the source HTML are not reliably closed with </a> (the
// last word of a verse runs straight into the next verse marker). Capture the
// visible text up to the next tag boundary instead of requiring a closing </a>.
const ANCHOR = /<a href="\.\.\/\.\.\/strongs\/(hebrew|greek)\/(\d+)\.htm"[^>]*title="([^"]*)"[^>]*>([^<]*)/gi;

function parseChapterHtml(html) {
    // Returns { [verse]: [ { language, code, number, original, morphology, gloss, text } ] }
    const verses = {};
    const markers = [];
    let m;
    VERSE_MARKER.lastIndex = 0;
    while ((m = VERSE_MARKER.exec(html))) {
        markers.push({ verse: m[1], start: m.index + m[0].length });
    }
    for (let i = 0; i < markers.length; i++) {
        const seg = html.slice(markers[i].start, i + 1 < markers.length ? markers[i + 1].start : html.length);
        const anchors = [];
        let a;
        ANCHOR.lastIndex = 0;
        while ((a = ANCHOR.exec(seg))) {
            const language = a[1].toLowerCase();
            const number = Number(a[2]);
            const code = `${language === "hebrew" ? "H" : "G"}${number}`;
            const { original, morphology, gloss } = parseTitle(a[3]);
            anchors.push({ language, number, code, original, morphology, gloss, text: a[4] });
        }
        if (anchors.length) verses[markers[i].verse] = anchors;
    }
    return verses;
}

// Find the longest leading word-run of `needle` that occurs in `norm` at or
// after `cursor`, searching forward only (keeps the cursor monotonic so a single
// miss does not cascade). Returns { at, length } in normalized space or null.
function forwardMatch(norm, needle, cursor) {
    const direct = norm.indexOf(needle, cursor);
    if (direct >= 0) return { at: direct, length: needle.length };
    const words = needle.split(" ").filter(Boolean);
    for (let count = words.length - 1; count >= 1; count--) {
        const sub = words.slice(0, count).join(" ");
        const at = norm.indexOf(sub, cursor);
        if (at >= 0) return { at, length: sub.length };
    }
    return null;
}

function alignVerse(verseText, anchors) {
    const { norm, map } = buildNorm(verseText);
    let cursor = 0;
    const tokens = [];
    const spans = [];
    let matched = 0;
    anchors.forEach((anchor, idx) => {
        const tokenIndex = idx + 1;
        const needle = normNeedle(anchor.text);
        let vStart = -1;
        let vEnd = -1;
        let english = "";
        if (needle) {
            const hit = forwardMatch(norm, needle, cursor);
            if (hit) {
                vStart = map[hit.at];
                vEnd = map[hit.at + hit.length - 1] + 1;
                english = verseText.slice(vStart, vEnd);
                cursor = hit.at + hit.length;
                matched += 1;
            }
        }
        tokens.push([tokenIndex, english, anchor.language, anchor.code, anchor.number, anchor.original, anchor.morphology, anchor.gloss]);
        if (vStart >= 0) {
            spans.push([tokenIndex, tokenIndex, vStart, vEnd, anchor.code, anchor.language]);
        }
    });
    return { tokens, spans, matched, total: anchors.length };
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
}

function main() {
    const generatedAt = new Date().toISOString();
    for (const { id, srcDir } of TRANSLATIONS) {
        const versesDir = path.join(APP_DATA, "verses", id);
        const books = fs
            .readdirSync(versesDir)
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.replace(/\.json$/, ""));
        let totalAnchors = 0;
        let totalMatched = 0;
        let booksDone = 0;
        for (const bookId of books) {
            const verseBook = readJson(path.join(versesDir, `${bookId}.json`));
            const bookMeta = verseBook.book || { id: bookId };
            const srcBookDir = path.join(BACKUP, srcDir, bookId);
            if (!fs.existsSync(srcBookDir)) {
                console.warn(`  [skip] no source HTML for ${id}/${bookId}`);
                continue;
            }
            const strongChapters = {};
            const wordMapChapters = {};
            const chapterFiles = fs
                .readdirSync(srcBookDir)
                .filter((f) => /^\d+\.htm$/.test(f))
                .sort((a, b) => parseInt(a) - parseInt(b));
            for (const file of chapterFiles) {
                const ch = file.replace(/\.htm$/, "");
                const verseTexts = verseBook.chapters?.[ch];
                if (!verseTexts) continue;
                const html = fs.readFileSync(path.join(srcBookDir, file), "utf8");
                const parsed = parseChapterHtml(html);
                const strongVerses = {};
                const wordMapVerses = {};
                for (const [verse, anchors] of Object.entries(parsed)) {
                    const verseText = verseTexts[verse];
                    if (!verseText) continue;
                    const { tokens, spans, matched, total } = alignVerse(verseText, anchors);
                    totalAnchors += total;
                    totalMatched += matched;
                    if (tokens.length) strongVerses[verse] = tokens;
                    if (spans.length) wordMapVerses[verse] = spans;
                }
                if (Object.keys(strongVerses).length) strongChapters[ch] = strongVerses;
                if (Object.keys(wordMapVerses).length) wordMapChapters[ch] = wordMapVerses;
            }
            writeJson(path.join(APP_DATA, "strongs", id, "books", `${bookId}.json`), {
                book: bookMeta,
                chapters: strongChapters,
            });
            writeJson(path.join(APP_DATA, "analysis", "word-map", id, `${bookId}.json`), {
                schema_version: 1,
                generated_at: generatedAt,
                source: {
                    verse_path: `data/verses/${id}/${bookId}.json`,
                    strongs_path: `data/strongs/${id}/books/${bookId}.json`,
                },
                span_schema: ["strong_token_index", "source_token_index", "start_offset", "end_offset", "strong_code", "language"],
                book: bookMeta,
                chapters: wordMapChapters,
            });
            booksDone += 1;
        }
        const rate = totalAnchors ? ((totalMatched / totalAnchors) * 100).toFixed(2) : "0";
        console.log(`${id.toUpperCase()}: ${booksDone} books, ${totalMatched}/${totalAnchors} anchors aligned (${rate}%)`);
    }
}

main();
