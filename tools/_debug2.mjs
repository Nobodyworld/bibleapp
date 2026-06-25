import fs from "node:fs";

function decodeEntities(value) {
    return String(value)
        .replace(/&#8217;|&#8216;|&#x2019;|&#x2018;/g, "'")
        .replace(/&#8212;|&#x2014;/gi, "--")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function stripTags(v) { return String(v).replace(/<[^>]+>/g, ""); }
function normChar(ch) {
    if (ch === "\u2019" || ch === "\u2018" || ch === "`") return "'";
    if (ch === "\u201C" || ch === "\u201D") return '"';
    if (ch === "\u2014" || ch === "\u2013") return "-";
    return ch.toLowerCase();
}
function buildNorm(text) {
    const chars = []; const map = []; let prev = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (/\s/.test(c)) { if (!prev && chars.length) { chars.push(" "); map.push(i); prev = true; } continue; }
        prev = false; chars.push(normChar(c)); map.push(i);
    }
    while (chars.length && chars[chars.length - 1] === " ") { chars.pop(); map.pop(); }
    return { norm: chars.join(""), map };
}
function normNeedle(raw) {
    let s = decodeEntities(stripTags(raw));
    s = s.replace(/[\u2019\u2018`]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2014\u2013]/g, "-")
        .replace(/\s+/g, " ").trim().toLowerCase();
    return s.replace(/^[^a-z0-9]+/i, "").replace(/[^a-z0-9]+$/i, "");
}

const html = fs.readFileSync("backup/archive-2026-06-20/openbible/ylts/genesis/1.htm", "utf8");
const VM = /<span class="reftext"><a[^>]*><b>(\d+)[a-z]?<\/b><\/a><\/span>/gi;
const ANCHOR = /<a href="\.\.\/\.\.\/strongs\/(hebrew|greek)\/(\d+)\.htm"[^>]*title="([^"]*)"[^>]*>(.*?)<\/a>/gis;
let m; const markers = [];
while ((m = VM.exec(html))) markers.push({ v: m[1], s: m.index + m[0].length });
const seg = html.slice(markers[0].s, markers[1].s);
let a; const anchors = [];
while ((a = ANCHOR.exec(seg))) anchors.push({ code: a[2], raw: a[4] });
console.log("anchors:", anchors.map((x) => x.code + "=" + JSON.stringify(x.raw)));

const v = JSON.parse(fs.readFileSync("app/data/verses/ylt/genesis.json", "utf8")).chapters["1"]["1"];
const { norm } = buildNorm(v);
let cursor = 0;
for (const an of anchors) {
    const needle = normNeedle(an.raw);
    const direct = norm.indexOf(needle, cursor);
    console.log(`code=${an.code} needle=[${needle}] cursor=${cursor} direct=${direct}`);
    if (direct >= 0) cursor = direct + needle.length;
}
