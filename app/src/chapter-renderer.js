import { els, isDetailHoverLocked, setDetail, setStatus, sortedNumericKeys, textNode } from "./dom.js?v=browser-comments-20260707b";
import { resolvePassageText } from "./data-service.js";
import { referenceKey, refDomId, parseLocationFromHref } from "./references.js";
import {
  addRedLetterRange,
  ensureStores,
  getRedLetterRanges,
  getTaggedTargetsForReference,
} from "./stores.js?v=browser-comments-20260707b";
import {
  createTextSpanTarget,
  createVerseTarget,
  resolveTextSpanAnchor,
} from "./semantic-targets.js?v=browser-comments-20260707b";
import { mapStrongChapterRanges } from "./strongs.js";
import { createStudyEmptyState, studyUnavailableLabel } from "./study-empty-state.js";
import { interlinearTokenIdentity } from "./ui-contracts.js";

export function createChapterRenderer(ctx) {
  let selectionMenu = null;
  let referenceHoverTooltipLayer = null;
  let activeReferenceHoverTarget = null;
  let referenceHoverHideTimer = null;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function eventKey(event, index) {
    return `${event.type}:${event.offset}:${event.marker || event.text || index}`;
  }

  function appendInlineEvent(parent, event) {
    if (event.type === "footnote") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fn-marker";
      button.textContent = event.marker;
      button.title = `Footnote ${event.marker}`;
      button.dataset.tooltip = `Footnote ${event.marker}: ${event.note?.text || ""}`;
      button.addEventListener("click", () => {
        ctx.highlightReaderContext?.({ verse: event.verse, commit: true });
        ctx.detailViews.showFootnote(event.note, event.reference, { verse: event.verse });
      });
      parent.append(button);
      return;
    }

    const label = document.createElement("span");
    label.className = "inline-block-label";
    label.textContent = event.text;
    parent.append(label);
  }

  function strongTooltip(token) {
    return [
      [token.strong_code, token.original].filter(Boolean).join(" "),
      token.transliteration || token.morphology,
      token.gloss,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  function activateStrongToken(event, token, tokenRange, element) {
    event.stopPropagation();
    if (element) element.dataset.suppressTooltip = "true";
    ctx.highlightReaderContext?.({
      verse: tokenRange.verseContext?.verse,
      wordElement: element,
      commit: true,
    });
    ctx.detailViews.showStrong(token, {
      pin: true,
      forceHistory: true,
      verseContext: tokenRange.verseContext,
    });
  }

  function hasActiveTextSelection(element) {
    const selection = window.getSelection?.();
    if (!selection?.rangeCount || selection.isCollapsed || !String(selection).trim()) return false;
    const body = element?.closest?.(".verse-body");
    return Boolean(body?.contains(selection.anchorNode) && body.contains(selection.focusNode));
  }

  function showHoverStrongForElement(element) {
    const token = element?.__bibleAppStrongToken;
    if (!token) return;
    if (isDetailHoverLocked()) return;
    ctx.highlightReaderContext?.({
      verse: element.__bibleAppVerseContext?.verse,
      wordElement: element,
    });
    ctx.detailViews.showStrong(token, {
      hover: true,
      history: "replace",
      verseContext: element.__bibleAppVerseContext,
    });
  }

  const handleHoverStrong = (event) => {
    const token = event.target.closest?.(".strong-token");
    if (token && els.content.contains(token)) showHoverStrongForElement(token);
  };

  els.content?.addEventListener("mouseover", handleHoverStrong);
  els.content?.addEventListener("pointerover", handleHoverStrong);

  els.content?.addEventListener("focusin", (event) => {
    const token = event.target.closest?.(".strong-token");
    if (token && els.content.contains(token)) showHoverStrongForElement(token);
  });

  function selectionPointCharOffset(body, node, offset) {
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    const segment = element?.closest?.("[data-verse-char-start][data-verse-char-end]");
    if (!segment || !body.contains(segment)) return null;
    const localRange = document.createRange();
    localRange.selectNodeContents(segment);
    try {
      localRange.setEnd(node, offset);
    } catch {
      return null;
    }
    const start = Number(segment.dataset.verseCharStart);
    return Number.isInteger(start) ? start + localRange.toString().length : null;
  }

  function isWordCoreChar(char) {
    return /[\p{L}\p{N}]/u.test(char || "");
  }

  function isWordJoiner(text, index) {
    const char = text[index];
    if (char !== "'" && char !== "\u2019" && char !== "-") return false;
    return isWordCoreChar(text[index - 1]) && isWordCoreChar(text[index + 1]);
  }

  function isWordCharAt(text, index) {
    if (index < 0 || index >= text.length) return false;
    return isWordCoreChar(text[index]) || isWordJoiner(text, index);
  }

  function expandToWordBoundaries(text, start, end) {
    let expandedStart = start;
    let expandedEnd = end;
    while (expandedStart > 0 && isWordCharAt(text, expandedStart - 1)) expandedStart -= 1;
    while (expandedEnd < text.length && isWordCharAt(text, expandedEnd)) expandedEnd += 1;
    return { start: expandedStart, end: expandedEnd };
  }

  function selectedTextRange(verseText, body) {
    const selection = window.getSelection?.();
    if (!selection?.rangeCount || selection.isCollapsed) return null;
    const domRange = selection.getRangeAt(0);
    if (!body.contains(domRange.startContainer) || !body.contains(domRange.endContainer)) return null;
    const rawStart = selectionPointCharOffset(body, domRange.startContainer, domRange.startOffset);
    const rawEnd = selectionPointCharOffset(body, domRange.endContainer, domRange.endOffset);
    if (!Number.isInteger(rawStart) || !Number.isInteger(rawEnd) || rawEnd <= rawStart) return null;
    const selected = verseText.slice(rawStart, rawEnd);
    const leading = selected.match(/^\s*/)?.[0].length || 0;
    const trailing = selected.match(/\s*$/)?.[0].length || 0;
    const start = rawStart + leading;
    const end = rawEnd - trailing;
    if (end <= start) return null;
    const expanded = expandToWordBoundaries(verseText, start, end);
    return { ...expanded, text: verseText.slice(expanded.start, expanded.end) };
  }

  function ensureSelectionMenu() {
    if (selectionMenu) return selectionMenu;
    selectionMenu = document.createElement("div");
    selectionMenu.className = "selection-action-menu";
    selectionMenu.hidden = true;
    document.body.append(selectionMenu);
    document.addEventListener("pointerdown", (event) => {
      if (!selectionMenu || selectionMenu.hidden) return;
      if (event.target.closest?.(".selection-action-menu, .verse-body")) return;
      selectionMenu.hidden = true;
      document.activeElement?.blur?.();
    });
    return selectionMenu;
  }

  function ensureReferenceHoverTooltipLayer() {
    if (referenceHoverTooltipLayer) return referenceHoverTooltipLayer;
    referenceHoverTooltipLayer = document.createElement("div");
    referenceHoverTooltipLayer.className = "reference-hover-tooltip-layer";
    referenceHoverTooltipLayer.setAttribute("role", "tooltip");
    referenceHoverTooltipLayer.hidden = true;
    referenceHoverTooltipLayer.addEventListener("mouseenter", cancelReferenceHoverTooltipHide);
    referenceHoverTooltipLayer.addEventListener("mouseleave", scheduleReferenceHoverTooltipHide);
    document.body.append(referenceHoverTooltipLayer);
    return referenceHoverTooltipLayer;
  }

  function cancelReferenceHoverTooltipHide() {
    if (!referenceHoverHideTimer) return;
    window.clearTimeout(referenceHoverHideTimer);
    referenceHoverHideTimer = null;
  }

  function scheduleReferenceHoverTooltipHide() {
    cancelReferenceHoverTooltipHide();
    referenceHoverHideTimer = window.setTimeout(() => {
      referenceHoverHideTimer = null;
      hideReferenceHoverTooltip();
    }, 140);
  }

  function positionReferenceHoverTooltip(target) {
    const layer = ensureReferenceHoverTooltipLayer();
    if (!target || layer.hidden) return;
    const targetRect = target.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const margin = 10;
    const offset = 8;
    const centerX = targetRect.left + targetRect.width / 2;
    const preferredTop = targetRect.top - layerRect.height - offset;
    const fallbackTop = targetRect.bottom + offset;
    const top =
      preferredTop >= margin
        ? preferredTop
        : Math.min(fallbackTop, viewportHeight - layerRect.height - margin);
    const left = clamp(centerX - layerRect.width / 2, margin, viewportWidth - layerRect.width - margin);
    layer.style.left = `${left}px`;
    layer.style.top = `${clamp(top, margin, viewportHeight - layerRect.height - margin)}px`;
  }

  function hideReferenceHoverTooltip(target = null) {
    if (target && activeReferenceHoverTarget !== target) return;
    cancelReferenceHoverTooltipHide();
    const layer = ensureReferenceHoverTooltipLayer();
    activeReferenceHoverTarget = null;
    layer.hidden = true;
    layer.textContent = "";
  }

  function renderReferenceHoverTooltip(layer, target) {
    const verses = target?.__bibleAppReferencePreviewVerses;
    const fragment = document.createDocumentFragment();
    const title = document.createElement("strong");
    title.className = "reference-hover-tooltip-title";
    title.textContent = target?.dataset?.referenceLabel || "Referenced passage";
    fragment.append(title);
    if (!Array.isArray(verses) || !verses.length) {
      const status = document.createElement("span");
      status.className = "reference-hover-tooltip-status";
      status.textContent = target?.dataset?.tooltip || "";
      fragment.append(status);
      layer.replaceChildren(fragment);
      return;
    }
    verses.forEach((item) => {
      const line = document.createElement("span");
      line.className = "reference-hover-tooltip-verse";
      const number = document.createElement("sup");
      number.textContent = item.verse;
      line.append(number, document.createTextNode(` ${item.text}`));
      fragment.append(line);
    });
    layer.replaceChildren(fragment);
  }

  function refreshReferenceHoverTooltip(target) {
    if (!target || activeReferenceHoverTarget !== target) return;
    const text = target.dataset.tooltip || "";
    const layer = ensureReferenceHoverTooltipLayer();
    renderReferenceHoverTooltip(layer, target);
    layer.hidden = !text;
    if (!layer.hidden) positionReferenceHoverTooltip(target);
  }

  function showReferenceHoverTooltip(target) {
    const text = target?.dataset?.tooltip || "";
    if (!text) {
      hideReferenceHoverTooltip(target);
      return;
    }
    cancelReferenceHoverTooltipHide();
    const layer = ensureReferenceHoverTooltipLayer();
    activeReferenceHoverTarget = target;
    renderReferenceHoverTooltip(layer, target);
    layer.hidden = false;
    layer.style.left = "0px";
    layer.style.top = "0px";
    positionReferenceHoverTooltip(target);
  }

  window.addEventListener("scroll", () => {
    if (!activeReferenceHoverTarget) return;
    if (!activeReferenceHoverTarget.isConnected) {
      hideReferenceHoverTooltip();
      return;
    }
    positionReferenceHoverTooltip(activeReferenceHoverTarget);
  }, true);

  window.addEventListener("resize", () => {
    if (!activeReferenceHoverTarget) return;
    positionReferenceHoverTooltip(activeReferenceHoverTarget);
  });

  function placeSelectionMenu(menu, selection) {
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect) return;
    menu.hidden = false;
    const menuRect = menu.getBoundingClientRect();
    const left = Math.min(
      Math.max(10, rect.left + rect.width / 2 - menuRect.width / 2),
      window.innerWidth - menuRect.width - 10,
    );
    const top = Math.max(10, rect.top - menuRect.height - 10);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function renderReferenceLabel(button, label) {
    button.textContent = String(label || "");
  }

  function showSelectionMenuForVerse(reference, verse, verseText, body, key) {
    const range = selectedTextRange(verseText, body);
    if (!range) {
      if (selectionMenu) selectionMenu.hidden = true;
      return;
    }
    const menu = ensureSelectionMenu();
    menu.replaceChildren();
    const target = createTextSpanTarget(
      key,
      {
        char_start: range.start,
        char_end: range.end,
        text_snapshot: range.text,
      },
      ctx.state.translationId,
    );
    if (!target) {
      menu.hidden = true;
      return;
    }

    const clearSelection = () => {
      menu.hidden = true;
      window.getSelection?.()?.removeAllRanges();
    };

    const favorite = ctx.detailViews.createFavoriteButton(target, {
      className: "selection-favorite-button",
      label: `“${range.text}”`,
      showLabel: true,
      onChange: () => {
        clearSelection();
        ctx.renderChapter();
      },
    });

    const tags = document.createElement("button");
    tags.type = "button";
    tags.textContent = "Tags";
    tags.setAttribute("aria-label", `Tag selected text: ${range.text}`);
    tags.addEventListener("click", () => {
      clearSelection();
      ctx.detailViews.showTargetTagEditor(target, {
        label: `${reference} — “${range.text}”`,
        preview: range.text,
        forceHistory: true,
        lock: true,
        onChange: () => ctx.renderChapter(),
      });
    });

    const red = document.createElement("button");
    red.type = "button";
    red.textContent = "Red letters";
    red.addEventListener("click", () => {
      addRedLetterRange(ctx.state, key, range);
      clearSelection();
      ctx.renderChapter();
    });

    const draft = document.createElement("button");
    draft.type = "button";
    draft.textContent = "Draft";
    draft.addEventListener("click", () => {
      clearSelection();
      void ctx.detailViews.showTranslationVerseWorkspace(verse, { selectedRange: range });
    });

    const study = document.createElement("button");
    study.type = "button";
    study.textContent = "Study";
    study.addEventListener("click", () => {
      clearSelection();
      void ctx.detailViews.showInterlinearVerse(reference, verse, { forceHistory: true });
    });

    menu.append(favorite, tags, study, draft, red);
    placeSelectionMenu(menu, window.getSelection?.());
  }

  function hydrateReferencePreview(button, location) {
    if (!location || button.dataset.previewLoaded === "true") return;
    button.__bibleAppReferencePreviewVerses = null;
    button.dataset.tooltip = "Loading passage...";
    refreshReferenceHoverTooltip(button);
    resolvePassageText(ctx.state.translationId, location)
      .then((passage) => {
        if (!button.isConnected) return;
        button.dataset.previewLoaded = "true";
        button.__bibleAppReferencePreviewVerses = passage?.verses || null;
        button.dataset.tooltip = passage?.text || "Referenced passage could not be loaded.";
        refreshReferenceHoverTooltip(button);
      })
      .catch(() => {
        if (!button.isConnected) return;
        button.dataset.previewLoaded = "true";
        button.__bibleAppReferencePreviewVerses = null;
        button.dataset.tooltip = "Referenced passage could not be loaded.";
        refreshReferenceHoverTooltip(button);
      });
  }

  function locationWithLabelRange(location, label) {
    if (!location) return null;
    const match = String(label || "").match(/\b(\d+):(\d+)(?:-(\d+))?/);
    if (!match) return location;
    return {
      ...location,
      chapter: Number(match[1]),
      verse_start: Number(match[2]),
      verse_end: match[3] ? Number(match[3]) : Number(match[2]),
    };
  }

  function markTextSegment(span, start, end, taggedTargets) {
    span.dataset.verseCharStart = String(start);
    span.dataset.verseCharEnd = String(end);
    if (!taggedTargets.length) return;
    span.classList.add("tagged-text-span");
    span.dataset.taggedTargetCount = String(taggedTargets.length);
  }

  function appendTextSegment(parent, text, isRed, start, end, taggedTargets) {
    const span = document.createElement("span");
    span.className = isRed ? "reader-text-segment red-letter" : "reader-text-segment";
    span.textContent = text;
    markTextSegment(span, start, end, taggedTargets);
    parent.append(span);
  }

  function appendTargetBadges(parent, taggedTargets, offset, reference) {
    taggedTargets
      .filter((entry) => entry.resolved.char_end === offset)
      .forEach((entry) => {
        const snapshot = entry.target.anchor?.text_snapshot || "";
        const badges = ctx.detailViews.renderTargetTagBadges(entry.target, {
          className: "reader-target-badges",
          compact: true,
          includeFavorite: true,
          interactive: true,
          label: `${reference} “${snapshot}”`,
          preview: snapshot,
          onChange: () => ctx.renderChapter(),
        });
        if (badges) parent.append(badges);
      });
  }

  function appendTextWithAnnotations(
    parent,
    verseText,
    start,
    end,
    events,
    tokenRanges,
    redRanges,
    taggedTargets,
    reference,
  ) {
    const inserted = new Set();
    const boundaries = new Set([start, end]);

    events.forEach((event) => {
      if (event.offset >= start && event.offset <= end) boundaries.add(event.offset);
    });
    tokenRanges.forEach((range) => {
      if (range.end <= start || range.start >= end) return;
      boundaries.add(Math.max(start, range.start));
      boundaries.add(Math.min(end, range.end));
    });
    redRanges.forEach((range) => {
      if (range.end <= start || range.start >= end) return;
      boundaries.add(Math.max(start, range.start));
      boundaries.add(Math.min(end, range.end));
    });
    taggedTargets.forEach(({ resolved }) => {
      if (resolved.char_end <= start || resolved.char_start >= end) return;
      boundaries.add(Math.max(start, resolved.char_start));
      boundaries.add(Math.min(end, resolved.char_end));
    });

    const points = [...boundaries].sort((a, b) => a - b);
    for (let index = 0; index < points.length - 1; index += 1) {
      const point = points[index];
      events.forEach((event, eventIndex) => {
        const key = eventKey(event, eventIndex);
        if (event.offset === point && !inserted.has(key)) {
          appendInlineEvent(parent, event);
          inserted.add(key);
        }
      });

      const next = points[index + 1];
      if (next <= point) continue;
      const text = verseText.slice(point, next);
      const tokenRange = tokenRanges.find((range) => range.start <= point && range.end >= next);
      const isRed = redRanges.some((range) => range.start <= point && range.end >= next);
      const segmentTargets = taggedTargets.filter(
        ({ resolved }) => resolved.char_start < next && resolved.char_end > point,
      );
      if (!tokenRange) {
        appendTextSegment(parent, text, isRed, point, next, segmentTargets);
        appendTargetBadges(parent, taggedTargets, next, reference);
        continue;
      }

      const token = document.createElement("span");
      token.className = "strong-token";
      token.tabIndex = 0;
      token.setAttribute("role", "button");
      token.textContent = text;
      token.title = `${tokenRange.token.strong_code || ""} ${tokenRange.token.original || ""}`.trim();
      token.dataset.tooltip = strongTooltip(tokenRange.token);
      token.dataset.tokenIndex = String(tokenRange.token.token_index ?? "");
      token.dataset.strongCode = tokenRange.token.strong_code || "";
      token.dataset.verse = String(tokenRange.verseContext?.verse || "");
      markTextSegment(token, point, next, segmentTargets);
      token.dataset.interlinearKey = interlinearTokenIdentity({
        verse: token.dataset.verse,
        tokenIndex: token.dataset.tokenIndex,
        strongCode: token.dataset.strongCode,
      });
      token.__bibleAppStrongToken = tokenRange.token;
      token.__bibleAppVerseContext = tokenRange.verseContext;
      token.setAttribute("aria-label", `Open Strong's details for ${text.trim()}: ${token.dataset.tooltip}`);
      if (isRed) token.classList.add("red-letter");
      const showHoverStrong = () => ctx.detailViews.showStrong(tokenRange.token, { hover: true, history: "replace" });
      token.addEventListener("mouseenter", showHoverStrong);
      token.addEventListener("mouseover", showHoverStrong);
      token.addEventListener("pointerenter", () => showHoverStrongForElement(token));
      token.addEventListener("pointerover", () => showHoverStrongForElement(token));
      token.addEventListener("mouseleave", () => {
        delete token.dataset.suppressTooltip;
      });
      token.addEventListener("focus", showHoverStrong);
      token.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activateStrongToken(event, tokenRange.token, tokenRange, token);
      });
      token.addEventListener("click", (event) => {
        if (hasActiveTextSelection(token)) {
          event.stopPropagation();
          return;
        }
        activateStrongToken(event, tokenRange.token, tokenRange, token);
      });
      parent.append(token);
      appendTargetBadges(parent, taggedTargets, next, reference);
    }

    events.forEach((event, eventIndex) => {
      const key = eventKey(event, eventIndex);
      if (event.offset === end && !inserted.has(key)) {
        appendInlineEvent(parent, event);
        inserted.add(key);
      }
    });
  }

  function renderPresentationBlock(block, headingNotes, reference) {
    const node = document.createElement("div");
    node.className = `presentation-block ${block.kind || ""}`;
    const label = document.createElement("span");
    label.textContent = block.text;
    node.append(label);

    headingNotes
      .filter((note) => note.anchor?.container_class === block.class)
      .forEach((note) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fn-marker";
        button.textContent = note.marker;
        button.title = `Footnote ${note.marker}`;
        button.dataset.tooltip = `Footnote ${note.marker}: ${note.text || ""}`;
        button.addEventListener("click", () => {
          ctx.highlightReaderContext?.({
            verse: note.anchor?.verse || block.verse,
            commit: true,
          });
          ctx.detailViews.showFootnote(note, reference, { verse: note.anchor?.verse || block.verse });
        });
        node.append(button);
      });

    if (block.cross_references?.length) {
      const cross = document.createElement("div");
      cross.className = "cross-links";
      block.cross_references.forEach((ref) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mini-button reference-hover";
        renderReferenceLabel(button, ref.label);
        button.dataset.referenceLabel = ref.label;
        const location = locationWithLabelRange(parseLocationFromHref(ref.href, ctx.findBook), ref.label);
        if (location) {
          button.dataset.tooltip = "Hover preview";
          const showPreview = () => {
            hydrateReferencePreview(button, location);
            showReferenceHoverTooltip(button);
          };
          button.addEventListener("mouseenter", showPreview);
          button.addEventListener("mouseover", showPreview);
          button.addEventListener("pointerenter", showPreview);
          button.addEventListener("focus", showPreview);
          button.addEventListener("mouseleave", scheduleReferenceHoverTooltipHide);
          button.addEventListener("blur", scheduleReferenceHoverTooltipHide);
          window.setTimeout(() => hydrateReferencePreview(button, location), 0);
        }
        button.addEventListener("click", () => {
          hideReferenceHoverTooltip(button);
          if (location) {
            void ctx.goToLocation(location.book_id, location.chapter, location.verse_start);
            return;
          }
          const wrap = document.createElement("div");
          const heading = document.createElement("h3");
          heading.textContent = ref.label;
          const path = document.createElement("p");
          path.textContent = ref.href;
          wrap.append(heading, path);
          setDetail("Heading Reference", wrap);
        });
        cross.append(button);
      });
      node.append(cross);
    }
    return node;
  }

  function renderVerse(reference, verse, verseText, chapterData) {
    const key = referenceKey(ctx.state.bookId, ctx.state.chapter, verse);
    const row = document.createElement("div");
    row.className = "verse-row";
    row.id = refDomId(key);
    row.dataset.refKey = key;
    row.dataset.verse = verse;

    const number = document.createElement("button");
    number.type = "button";
    number.className = "verse-number";
    number.textContent = verse;
    number.title = "Show parallel translations";
    number.addEventListener("click", () => {
      ctx.highlightReaderContext?.({ verse, commit: true });
      void ctx.detailViews.showParallelVerse(reference, verse, verseText, { history: "replace", lock: true, verse });
    });

    const numberWrap = document.createElement("div");
    numberWrap.className = "verse-number-wrap";
    const numberMenuWrap = document.createElement("div");
    numberMenuWrap.className = "verse-number-menu-wrap";

    const body = document.createElement("div");
    body.className = "verse-body";

    const notes = chapterData.notesByVerse[verse] || [];
    const events = [];
    notes
      .filter((note) => note.anchor?.scope === "verse")
      .forEach((note) => {
        events.push({
          type: "footnote",
          offset: Number(note.anchor.char_offset || 0),
          marker: note.marker,
          note,
          reference,
          verse,
        });
      });

    chapterData.inlineBlocks
      .filter((block) => block.verse === verse)
      .forEach((block) => {
        events.push({
          type: "block",
          offset: Number(block.char_offset || 0),
          text: block.text,
        });
      });

    const tokenRanges = ctx.canUseCapability?.("strongs-overlay") ? chapterData.strongRangesByVerse?.[verse] || [] : [];
    const redRanges = getRedLetterRanges(ctx.state, key);
    const taggedTextTargets = getTaggedTargetsForReference(ctx.state, key, {
      targetTypes: ["text_span"],
      translationId: ctx.state.translationId,
    })
      .map((entry) => ({ ...entry, resolved: resolveTextSpanAnchor(entry.target, verseText) }))
      .filter(
        (entry) =>
          Number.isInteger(entry.resolved.char_start) &&
          Number.isInteger(entry.resolved.char_end) &&
          entry.resolved.char_end > entry.resolved.char_start,
      );
    const lines = chapterData.linesByVerse[verse] || [
      { class: "reg", char_offset: 0, char_length: verseText.length, order: 1 },
    ];

    lines
      .slice()
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .forEach((line) => {
        const lineNode = document.createElement("div");
        lineNode.className = `verse-line ${line.class || "reg"} ${line.style || ""}`;
        const start = Number(line.char_offset || 0);
        const end = Math.min(verseText.length, start + Number(line.char_length || 0));
        appendTextWithAnnotations(
          lineNode,
          verseText,
          start,
          end,
          events,
          tokenRanges,
          redRanges,
          taggedTextTargets,
          reference,
        );
        body.append(lineNode);
      });

    const badges = ctx.detailViews.renderTagBadges(key);
    if (badges) numberWrap.append(badges);
    numberMenuWrap.append(number, ctx.detailViews.renderInlineTagPicker(key));
    numberWrap.append(numberMenuWrap);

    const crossRecord = ctx.canUseCapability?.("crossrefs") ? chapterData.crossrefs?.[`${ctx.state.chapter}:${verse}`] : null;
    const hasInterlinear = ctx.canUseCapability?.("interlinear") && Boolean(chapterData.interlinear?.[verse]?.length);
    const hasCommentary = ctx.canUseCapability?.("commentary");
    const studyButton = document.createElement("button");
    studyButton.type = "button";
    studyButton.className = "verse-study-button";
    const hasStudyData = Boolean(crossRecord || hasInterlinear || hasCommentary);
    studyButton.title = hasStudyData ? "Open verse study tabs" : studyUnavailableLabel("verseStudy");
    studyButton.setAttribute(
      "aria-label",
      hasStudyData ? `Open study tools for ${reference}` : `${reference}: ${studyButton.title}`,
    );
    if (!hasStudyData) studyButton.dataset.unavailable = "true";
    studyButton.textContent = "⋯";
    studyButton.addEventListener("click", (event) => {
      event.stopPropagation();
      ctx.highlightReaderContext?.({ verse, commit: true });
      if (crossRecord) {
        ctx.detailViews.showCrossrefs(reference, crossRecord, { verse, forceHistory: true });
      } else if (hasInterlinear) {
        void ctx.detailViews.showInterlinearVerse(reference, verse, { forceHistory: true });
      } else if (hasCommentary) {
        void ctx.detailViews.showCommentary(reference, verse, { forceHistory: true });
      } else {
        const empty = createStudyEmptyState(ctx, "verseStudy", {
          reference,
          capabilityIds: ["crossrefs", "commentary", "interlinear"],
        });
        ctx.detailViews.showStudyUnavailable?.("Study Tools", empty, { forceHistory: true });
      }
    });

    const favoriteButton = ctx.detailViews.createFavoriteButton(
      createVerseTarget(key, ctx.state.translationId),
      {
        className: "verse-favorite-button",
        label: reference,
        onChange: () => {
          ctx.renderChapter();
          ctx.syncFavoriteButtons?.();
        },
      },
    );
    const verseActions = document.createElement("div");
    verseActions.className = "verse-row-actions";
    verseActions.append(favoriteButton, studyButton);

    body.addEventListener("mouseup", () => showSelectionMenuForVerse(reference, verse, verseText, body, key));
    body.addEventListener("touchend", () => window.setTimeout(() => showSelectionMenuForVerse(reference, verse, verseText, body, key), 0));
    body.addEventListener("keyup", () => showSelectionMenuForVerse(reference, verse, verseText, body, key));

    row.append(numberWrap, body, verseActions);
    return row;
  }

  function renderChapter() {
    ensureStores(ctx.state);
    const book = ctx.state.verseBook?.book;
    const chapterVerses = ctx.state.verseBook?.chapters?.[ctx.state.chapter] || {};
    const chapterPresentation = ctx.state.presentation?.chapters?.[ctx.state.chapter] || {};
    const notesByVerse = ctx.state.footnotes?.chapters?.[ctx.state.chapter] || {};
    const crossrefs = ctx.canUseCapability?.("crossrefs") ? ctx.state.crossrefs?.verses || {} : {};
    const strongs = ctx.canUseCapability?.("strongs-overlay") ? ctx.state.strongs?.chapters?.[ctx.state.chapter] || {} : {};
    const interlinear = ctx.canUseCapability?.("interlinear") ? ctx.state.interlinear?.chapters?.[ctx.state.chapter] || {} : {};
    const blocks = chapterPresentation.blocks || [];
    const linesByVerse = chapterPresentation.verse_lines || {};
    const inlineBlocks = blocks.filter((block) => block.verse);

    els.title.textContent = `${book?.name || ctx.state.bookId} ${ctx.state.chapter}`;
    els.content.replaceChildren();

    const verses = sortedNumericKeys(chapterVerses);
    const strongRangesByVerse = mapStrongChapterRanges(chapterVerses, strongs);
    Object.entries(strongRangesByVerse).forEach(([verse, ranges]) => {
      const reference = ctx.currentReference(verse);
      ranges.forEach((range) => {
        range.verseContext = { reference, verse };
      });
    });
    if (!verses.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No verses found for this chapter.";
      els.content.append(empty);
      return;
    }

    verses.forEach((verse) => {
      const reference = ctx.currentReference(verse);
      const headingNotes = (notesByVerse[verse] || []).filter((note) => note.anchor?.scope === "heading");
      blocks
        .filter((block) => block.before_verse === verse)
        .forEach((block) => {
          els.content.append(renderPresentationBlock(block, headingNotes, reference));
        });
      els.content.append(
        renderVerse(reference, verse, chapterVerses[verse], {
          notesByVerse,
          inlineBlocks,
          linesByVerse,
          crossrefs,
          strongs,
          strongRangesByVerse,
          interlinear,
        }),
      );
    });

    ctx.syncChapterButtons();
    ctx.syncToolButtons();
    setStatus(`${ctx.state.verseBook.translation?.code || ctx.state.translationId.toUpperCase()} data loaded`);

    if (ctx.state.pendingScrollVerse) {
      const target = document.querySelector(
        `#${refDomId(referenceKey(ctx.state.bookId, ctx.state.chapter, ctx.state.pendingScrollVerse))}`,
      );
      ctx.state.pendingScrollVerse = null;
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        target.classList.add("target-verse");
        window.setTimeout(() => target.classList.remove("target-verse"), 1600);
      }
    }
  }

  return {
    renderChapter,
  };
}
