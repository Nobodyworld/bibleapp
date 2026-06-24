import { DEFAULT_ROUTE } from "./src/config.js";
import { capabilityAvailable, resolveCapability } from "./src/capabilities.js";
import { createChapterRenderer } from "./src/chapter-renderer.js";
import { loadManifest, loadReaderBookData, translationCanLoadBook } from "./src/data-service.js";
import { createDetailViews } from "./src/detail-views.js";
import {
  els,
  goBackDetail,
  goForwardDetail,
  option,
  resetDetail,
  setDetailHoverLocked,
  setStatus,
  sortedNumericKeys,
} from "./src/dom.js";
import { createReferenceButton as makeReferenceButton, referenceKey, refDomId } from "./src/references.js";
import { normalizeRoute, parseReaderRoute, writeReaderRoute } from "./src/routing.js";
import { initStores, listenForUserDataChanges } from "./src/stores.js";
import { studyUnavailableLabel } from "./src/study-empty-state.js";

const state = {
  manifest: null,
  translationId: DEFAULT_ROUTE.translationId,
  bookId: DEFAULT_ROUTE.bookId,
  chapter: DEFAULT_ROUTE.chapter,
  verseBook: null,
  footnotes: null,
  presentation: null,
  crossrefs: null,
  strongs: null,
  commentary: null,
  outline: null,
  interlinear: null,
  pendingScrollVerse: null,
  tagStore: null,
  workspaceStore: null,
  userStoreBackend: null,
  userStoreMigration: null,
};

function findBook(bookId) {
  return state.manifest?.books?.find((book) => book.id === bookId) || null;
}

function currentReference(verse) {
  const book = state.verseBook?.book || findBook(state.bookId);
  return `${book?.name || state.bookId} ${state.chapter}:${verse}`;
}

function currentRoute(verse = null) {
  return {
    translationId: state.translationId,
    bookId: state.bookId,
    chapter: state.chapter,
    verse,
  };
}

function createReferenceButton(label, location) {
  return makeReferenceButton(label, location, goToLocation);
}

function canUseCapability(capabilityId) {
  if (!state.manifest?.package_manifest && !state.packageManifest) return true;
  return capabilityAvailable(state.packageManifest || state.manifest.package_manifest, state.packageStore, capabilityId, {
    assumeBundledFullAccess: true,
  });
}

function getCapabilityState(capabilityId) {
  return resolveCapability(state.packageManifest || state.manifest?.package_manifest, state.packageStore, capabilityId, {
    assumeBundledFullAccess: true,
  });
}

function clearReaderHighlight() {
  document.querySelectorAll(".reader-context-verse, .reader-context-word").forEach((node) => {
    node.classList.remove("reader-context-verse", "reader-context-word");
  });
}

function highlightReaderContext(options = {}) {
  clearReaderHighlight();
  const wordElement = options.wordElement || null;
  const verse = options.verse || wordElement?.closest?.(".verse-row")?.dataset?.verse || null;
  const row =
    wordElement?.closest?.(".verse-row") ||
    (verse ? document.getElementById(refDomId(referenceKey(state.bookId, state.chapter, verse))) : null);
  if (row) row.classList.add("reader-context-verse");
  if (wordElement?.classList) wordElement.classList.add("reader-context-word");
}

const ctx = {
  state,
  clearReaderHighlight,
  createReferenceButton,
  currentReference,
  findBook,
  goToLocation,
  goToRoute: navigateToRoute,
  highlightReaderContext,
  canUseCapability,
  getCapabilityState,
  renderChapter: () => renderer.renderChapter(),
  syncChapterButtons,
  syncToolButtons,
};

const detailViews = createDetailViews(ctx);
ctx.detailViews = detailViews;
const renderer = createChapterRenderer(ctx);

function fillTranslationOptions() {
  els.translation.replaceChildren();
  state.manifest.translations.forEach((translation) => {
    els.translation.append(option(translation.id, translation.code || translation.id.toUpperCase()));
  });
  els.translation.value = state.translationId;
}

function fillBookOptions() {
  els.book.replaceChildren();
  state.manifest.books.forEach((book) => {
    els.book.append(option(book.id, book.name));
  });
  els.book.value = state.bookId;
}

function fillChapterOptions() {
  els.chapter.replaceChildren();
  sortedNumericKeys(state.verseBook.chapters).forEach((chapter) => {
    els.chapter.append(option(chapter, chapter));
  });
  els.chapter.value = state.chapter;
}

function syncChapterButtons() {
  const chapters = sortedNumericKeys(state.verseBook?.chapters);
  const index = chapters.indexOf(state.chapter);
  els.prev.disabled = index <= 0;
  els.next.disabled = index < 0 || index >= chapters.length - 1;
  if (els.prevFloat) els.prevFloat.disabled = els.prev.disabled;
  if (els.nextFloat) els.nextFloat.disabled = els.next.disabled;
}

function syncToolButtons() {
  const tools = [
    [els.showSearch, "search", "Search this book"],
    [els.showOutline, "outlines", "Book outline"],
    [els.showInterlinear, "interlinear", "Interlinear words"],
    [els.showProverbs, "translation", "Translation workspace"],
  ];
  tools.forEach(([button, key, fallbackTitle]) => {
    if (!button) return;
    button.disabled = false;
    const capabilityId = key === "translation" ? "interlinear" : key;
    const unavailable = !canUseCapability(capabilityId);
    button.title = unavailable ? studyUnavailableLabel(key) : fallbackTitle;
    button.setAttribute("aria-label", button.title);
    button.dataset.unavailable = unavailable ? "true" : "false";
  });
}

function writeHomeRoute(options = {}) {
  if (window.location.hash === "#/home") return;
  if (options.replace) {
    window.history.replaceState(null, "", "#/home");
  } else {
    window.history.pushState(null, "", "#/home");
  }
}

function showHomePage(options = {}) {
  setStatus("Home");
  if (options.writeUrl !== false) writeHomeRoute({ replace: Boolean(options.replace) });
  els.title.textContent = "Bible App Home";
  els.content.replaceChildren();
  const home = document.createElement("div");
  home.className = "home-view";

  const intro = document.createElement("section");
  intro.className = "home-intro";
  const heading = document.createElement("h3");
  heading.textContent = "Study workspace";
  const text = document.createElement("p");
  text.textContent = "Open the reader, search, tags, translation work, jobs, and data tools from one place.";
  intro.append(heading, text);

  const grid = document.createElement("div");
  grid.className = "home-action-grid";
  const runWithReaderData = (action) => async () => {
    if (!state.verseBook) await navigateToRoute(currentRoute(), { replace: true });
    action();
  };
  const actions = [
    ["Continue reading", () => void navigateToRoute(currentRoute(), { replace: true })],
    ["Search", runWithReaderData(detailViews.showSearch)],
    ["Tags", runWithReaderData(detailViews.showTagIndex)],
    ["Translate", runWithReaderData(detailViews.showTranslationWorkspaceIndex)],
    ["Jobs", runWithReaderData(detailViews.showJobs)],
    ["Data", runWithReaderData(detailViews.showUserData)],
  ];
  actions.forEach(([label, action]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "home-action";
    button.textContent = label;
    button.addEventListener("click", action);
    grid.append(button);
  });

  home.append(intro, grid);
  els.content.append(home);
  els.prev.disabled = true;
  els.next.disabled = true;
  if (els.prevFloat) els.prevFloat.disabled = true;
  if (els.nextFloat) els.nextFloat.disabled = true;
}

async function loadBookData() {
  setStatus("Loading book data...");
  const requestedChapter = state.chapter;
  const bookData = await loadReaderBookData(state.translationId, state.bookId);

  Object.assign(state, bookData, { commentary: null });

  if (!state.verseBook.chapters?.[state.chapter]) {
    state.chapter = sortedNumericKeys(state.verseBook.chapters)[0] || "1";
  }

  fillChapterOptions();
  renderer.renderChapter();

  if (state.chapter !== requestedChapter) {
    writeReaderRoute(currentRoute(), { replace: true });
  }
}

async function navigateToRoute(route, options = {}) {
  if (route.home) {
    if (state.manifest) {
      fillTranslationOptions();
      fillBookOptions();
    }
    showHomePage(options);
    return;
  }
  clearReaderHighlight();
  const normalized = normalizeRoute(route, state.manifest);
  const canLoad = await translationCanLoadBook(normalized.translationId, normalized.bookId);
  const next = {
    ...normalized,
    translationId: canLoad ? normalized.translationId : DEFAULT_ROUTE.translationId,
  };

  state.translationId = next.translationId;
  state.bookId = next.bookId;
  state.chapter = next.chapter;
  state.pendingScrollVerse = next.verse || null;

  fillTranslationOptions();
  fillBookOptions();

  if (options.writeUrl !== false) {
    writeReaderRoute(next, { replace: Boolean(options.replace) });
  }

  await loadBookData();
}

async function goToLocation(bookId, chapter, verse) {
  await navigateToRoute({
    translationId: state.translationId,
    bookId,
    chapter: String(chapter || 1),
    verse: String(verse || 1),
  });
}

async function goToChapter(delta) {
  clearReaderHighlight();
  const chapters = sortedNumericKeys(state.verseBook?.chapters);
  const index = chapters.indexOf(state.chapter);
  const next = chapters[index + delta];
  if (!next) return;
  await navigateToRoute({
    translationId: state.translationId,
    bookId: state.bookId,
    chapter: next,
    verse: null,
  });
}

function bindEvents() {
  function maybeDisengageLockedDetail(event) {
    if (
      !event.target.closest?.(
        "button, a, input, select, textarea, [role='button'], .detail-pane, .strong-token, .language-word-hover, .language-letter-hover, .letter-unit",
      )
    ) {
      setDetailHoverLocked(false);
      detailViews.clearStrongPin();
      clearReaderHighlight();
    }
  }

  els.translation.addEventListener("change", () => {
    void navigateToRoute({
      translationId: els.translation.value,
      bookId: state.bookId,
      chapter: state.chapter,
      verse: null,
    });
  });
  els.book.addEventListener("change", () => {
    void navigateToRoute({
      translationId: state.translationId,
      bookId: els.book.value,
      chapter: "1",
      verse: null,
    });
  });
  els.chapter.addEventListener("change", () => {
    void navigateToRoute({
      translationId: state.translationId,
      bookId: state.bookId,
      chapter: els.chapter.value,
      verse: null,
    });
  });
  els.prev.addEventListener("click", () => void goToChapter(-1));
  els.next.addEventListener("click", () => void goToChapter(1));
  els.prevFloat?.addEventListener("click", () => void goToChapter(-1));
  els.nextFloat?.addEventListener("click", () => void goToChapter(1));
  els.homeButton?.addEventListener("click", () => void navigateToRoute({ home: true }, { writeUrl: true }));
  els.showOutline.addEventListener("click", detailViews.showOutline);
  els.showInterlinear.addEventListener("click", detailViews.showInterlinearChapter);
  els.showSearch.addEventListener("click", detailViews.showSearch);
  els.showTags.addEventListener("click", detailViews.showTagIndex);
  els.showJobs.addEventListener("click", detailViews.showJobs);
  els.showUserData.addEventListener("click", detailViews.showUserData);
  els.showProverbs.addEventListener("click", detailViews.showTranslationWorkspaceIndex);
  els.detailBack.addEventListener("click", () => {
    detailViews.clearStrongPin();
    goBackDetail();
  });
  els.detailForward.addEventListener("click", () => {
    detailViews.clearStrongPin();
    goForwardDetail();
  });
  els.clearDetail.addEventListener("click", () => {
    detailViews.clearStrongPin();
    clearReaderHighlight();
    resetDetail();
  });
  document.addEventListener("pointerdown", maybeDisengageLockedDetail, true);
  document.addEventListener("click", maybeDisengageLockedDetail, true);

  const handleRouteChange = () => {
    const route = parseReaderRoute();
    if (route.home) {
      showHomePage({ writeUrl: false });
      return;
    }
    void navigateToRoute(route, { writeUrl: false });
  };
  window.addEventListener("popstate", handleRouteChange);
  window.addEventListener("hashchange", handleRouteChange);
}

async function init() {
  await initStores(state);
  listenForUserDataChanges(state, () => {
    setStatus("User data changed in another tab");
  });
  bindEvents();
  try {
    state.manifest = await loadManifest();
    state.packageManifest = await fetch("./data/package-manifest.json").then((response) => {
      if (!response.ok) throw new Error("Package manifest could not be loaded.");
      return response.json();
    });
    await navigateToRoute(parseReaderRoute(), {
      replace: !window.location.hash,
      writeUrl: true,
    });
  } catch (error) {
    console.error(error);
    els.content.innerHTML = "";
    const node = document.createElement("div");
    node.className = "error-state";
    node.textContent = error instanceof Error ? error.message : "Unable to load reader data.";
    els.content.append(node);
    setStatus("Data load failed");
  }
}

init();
