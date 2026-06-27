export function referenceKey(bookId, chapter, verse) {
  return `${bookId}:${chapter}:${verse}`;
}

export function refDomId(key) {
  return `ref-${key.replace(/[^a-z0-9_-]/gi, "-")}`;
}

export function parseLocationFromHref(href, findBook) {
  if (!href) return null;
  const normalized = href.replace(/\\/g, "/");
  let match = normalized.match(/#\/read\/[^/]+\/([^/]+)\/(\d+)(?:\/(\d+))?/i);
  if (match && findBook(decodeURIComponent(match[1]))) {
    return {
      book_id: decodeURIComponent(match[1]),
      chapter: Number(match[2]),
      verse_start: Number(match[3] || 1),
    };
  }
  match = normalized.match(/\/([1-3]?[a-z0-9_]+)\/(\d+)-(\d+)\.htm/i);
  if (match && findBook(match[1])) {
    return {
      book_id: match[1],
      chapter: Number(match[2]),
      verse_start: Number(match[3]),
    };
  }
  match = normalized.match(/\/([1-3]?[a-z0-9_]+)\/(\d+)\.htm(?:#(\d+))?/i);
  if (match && findBook(match[1])) {
    return {
      book_id: match[1],
      chapter: Number(match[2]),
      verse_start: Number(match[3] || 1),
    };
  }
  return null;
}

export function createReferenceButton(label, location, goToLocation) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "link-button";
  button.textContent = label;
  // Store location data for hover highlighting
  button.dataset.bookId = location.book_id;
  button.dataset.chapter = location.chapter;
  button.dataset.verse = location.verse_start || location.verse || 1;
  button.addEventListener("click", () => {
    void goToLocation(location.book_id, location.chapter, location.verse_start || location.verse || 1);
  });
  return button;
}

export function makeInternalLinksNavigable(container, findBook, goToLocation) {
  container.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const location = parseLocationFromHref(link.getAttribute("href"), findBook);
    if (!location) return;
    event.preventDefault();
    void goToLocation(location.book_id, location.chapter, location.verse_start);
  });
}
