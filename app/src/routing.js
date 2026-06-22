import { DEFAULT_ROUTE } from "./config.js";

function clean(value) {
  return String(value || "").trim();
}

export function normalizeRoute(route, manifest) {
  const bookExists = (bookId) => manifest?.books?.some((book) => book.id === bookId);
  const translationExists = (translationId) =>
    manifest?.translations?.some((translation) => translation.id === translationId);

  return {
    translationId: translationExists(route.translationId) ? clean(route.translationId) : DEFAULT_ROUTE.translationId,
    bookId: bookExists(route.bookId) ? clean(route.bookId) : DEFAULT_ROUTE.bookId,
    chapter: clean(route.chapter) || DEFAULT_ROUTE.chapter,
    verse: clean(route.verse) || null,
  };
}

export function parseReaderRoute(hash = window.location.hash) {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const parts = value.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "home") return { ...DEFAULT_ROUTE, home: true };
  if (parts[0] !== "read") return { ...DEFAULT_ROUTE };
  return {
    translationId: parts[1] || DEFAULT_ROUTE.translationId,
    bookId: parts[2] || DEFAULT_ROUTE.bookId,
    chapter: parts[3] || DEFAULT_ROUTE.chapter,
    verse: parts[4] || null,
  };
}

export function readerRouteHash(route) {
  const parts = ["read", route.translationId, route.bookId, route.chapter];
  if (route.verse) parts.push(route.verse);
  return `#/${parts.map((part) => encodeURIComponent(String(part))).join("/")}`;
}

export function writeReaderRoute(route, options = {}) {
  const hash = readerRouteHash(route);
  if (window.location.hash === hash) return hash;
  if (options.replace) {
    window.history.replaceState(null, "", hash);
  } else {
    window.history.pushState(null, "", hash);
  }
  return hash;
}
