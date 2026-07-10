const ACTIVE_OPTION_SELECTOR = ".reader-picker-option.active";
const PICKER_READY_TIMEOUT_MS = 1800;
const READER_BACKGROUND_RESET_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
  "[role='button']",
  ".verse-context-tabs",
  ".detail-floating-nav",
  ".strong-token",
  ".language-word-hover",
  ".language-letter-hover",
  ".letter-unit",
].join(", ");

let frozenReaderToken = null;
let frozenReaderRow = null;
let frozenHighlightObserver = null;

function afterPickerPaint(callback) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
}

function setPickerExpanded(button, panel, expanded) {
  if (!button || !panel) return;
  button.setAttribute("aria-expanded", expanded ? "true" : "false");
  panel.hidden = !expanded;
}

function scrollActivePickerOptionIntoView(panel) {
  if (!panel) return;
  afterPickerPaint(() => {
    if (panel.hidden) return;
    panel.querySelector(ACTIVE_OPTION_SELECTOR)?.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
  });
}

function waitForPickerOptions(panel, isReady, callback) {
  const startedAt = Date.now();
  const check = () => {
    if (!panel || Date.now() - startedAt > PICKER_READY_TIMEOUT_MS) return;
    if (panel.querySelector(ACTIVE_OPTION_SELECTOR) && isReady()) {
      callback();
      return;
    }
    window.requestAnimationFrame(check);
  };
  window.requestAnimationFrame(check);
}

function openChapterPickerAfterBookSelection(selectedBookLabel) {
  const bookButton = document.getElementById("bookPickerButton");
  const bookPanel = document.getElementById("bookPickerPanel");
  const chapterButton = document.getElementById("chapterPickerButton");
  const chapterPanel = document.getElementById("chapterPickerPanel");

  waitForPickerOptions(
    chapterPanel,
    () =>
      bookButton?.textContent?.trim() === selectedBookLabel &&
      chapterButton?.textContent?.trim() === "1",
    () => {
      setPickerExpanded(bookButton, bookPanel, false);
      setPickerExpanded(chapterButton, chapterPanel, true);
      scrollActivePickerOptionIntoView(chapterPanel);
    },
  );
}

function disconnectFrozenHighlightObserver() {
  frozenHighlightObserver?.disconnect();
  frozenHighlightObserver = null;
}

function applyFrozenReaderHighlight() {
  if (!frozenReaderToken?.isConnected || !frozenReaderRow?.isConnected) {
    clearFrozenReaderHighlight({ removeClasses: false });
    return;
  }
  frozenReaderRow.classList.add("reader-context-verse");
  frozenReaderToken.classList.add("reader-context-word");
}

function observeFrozenReaderHighlight() {
  disconnectFrozenHighlightObserver();
  if (!frozenReaderToken || !frozenReaderRow) return;
  frozenHighlightObserver = new MutationObserver(() => applyFrozenReaderHighlight());
  frozenHighlightObserver.observe(frozenReaderToken, {
    attributes: true,
    attributeFilter: ["class"],
  });
  frozenHighlightObserver.observe(frozenReaderRow, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

function freezeReaderHighlight(token) {
  const row = token?.closest?.(".verse-row");
  if (!token || !row) return;
  frozenReaderToken = token;
  frozenReaderRow = row;
  window.requestAnimationFrame(() => {
    applyFrozenReaderHighlight();
    observeFrozenReaderHighlight();
  });
}

function clearFrozenReaderHighlight(options = {}) {
  const removeClasses = options.removeClasses !== false;
  disconnectFrozenHighlightObserver();
  if (removeClasses) {
    frozenReaderToken?.classList?.remove("reader-context-word");
    frozenReaderRow?.classList?.remove("reader-context-verse");
  }
  frozenReaderToken = null;
  frozenReaderRow = null;
}

function handleReaderPickerClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest("#bookPickerButton")) {
    scrollActivePickerOptionIntoView(document.getElementById("bookPickerPanel"));
    return;
  }

  if (target.closest("#chapterPickerButton")) {
    scrollActivePickerOptionIntoView(document.getElementById("chapterPickerPanel"));
    return;
  }

  const selectedBook = target.closest("#bookPickerPanel .reader-picker-option");
  if (selectedBook) {
    openChapterPickerAfterBookSelection(selectedBook.textContent.trim());
    return;
  }

  const readerToken = target.closest("#chapterContent .strong-token");
  if (readerToken) {
    freezeReaderHighlight(readerToken);
  }
}

function handleReaderFreezeReset(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#clearDetail")) {
    clearFrozenReaderHighlight();
    return;
  }
  if (!target.closest(READER_BACKGROUND_RESET_SELECTOR)) {
    clearFrozenReaderHighlight();
  }
}

document.addEventListener("click", handleReaderPickerClick);
document.addEventListener("pointerdown", handleReaderFreezeReset, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") clearFrozenReaderHighlight();
});
window.addEventListener("hashchange", () => clearFrozenReaderHighlight({ removeClasses: false }));
window.addEventListener("popstate", () => clearFrozenReaderHighlight({ removeClasses: false }));
