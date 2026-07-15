import { studyUnavailableLabel } from "../study-empty-state.js";
import { CONTROL_STATES, resolveControlState } from "../ui-contracts.js";
import {
  PANEL_SCOPE_LABELS,
  panelContextSummary,
  panelScopeSequence,
  panelToolsForScope,
} from "../panel-context-model.js";
import { resolveInterlinearVerseTokens } from "../strongs.js?v=pr13-live-qa-20260711e";
import { createSourceTokenTarget, createVerseTarget } from "../semantic-targets.js?v=pr13-live-qa-20260711e";

function getVerseText(ctx, verse) {
  return ctx.state.verseBook?.chapters?.[ctx.state.chapter]?.[verse] || "";
}

function getCrossRecord(ctx, verse) {
  if (!ctx.canUseCapability?.("crossrefs")) return null;
  return ctx.state.crossrefs?.verses?.[`${ctx.state.chapter}:${verse}`] || null;
}

function hasInterlinear(ctx, verse) {
  if (!ctx.canUseCapability?.("interlinear")) return false;
  return Boolean(
    resolveInterlinearVerseTokens({
      rawInterlinearByVerse: ctx.state.interlinear?.chapters?.[ctx.state.chapter],
      rawStrongByVerse: ctx.state.strongs?.chapters?.[ctx.state.chapter],
      chapterVerses: ctx.state.verseBook?.chapters?.[ctx.state.chapter],
      targetVerse: verse,
      reference: { bookId: ctx.state.bookId, chapter: ctx.state.chapter },
    }).length,
  );
}

function resolveWordContext(ctx, explicitContext, verse) {
  return explicitContext?.token ? explicitContext : ctx.getActiveWordContext?.(verse) || null;
}

function createScopeGroup(scope) {
  const group = document.createElement("section");
  group.className = "panel-context-group";
  group.dataset.panelScope = scope;
  group.setAttribute("aria-label", `${PANEL_SCOPE_LABELS[scope]} scope`);

  const controls = document.createElement("div");
  controls.className = "panel-context-controls";
  group.append(controls);
  return { group, controls };
}

function wordHighlightOptions(wordContext, verse) {
  const token = wordContext?.token;
  if (!token) return { verse, commit: true };
  return {
    verse,
    word: {
      tokenIndex: token.token_index,
      strongCode: token.strong_code,
      language: token.language,
      original: token.original,
    },
    commit: true,
  };
}

function actionForTool(ctx, tool, reference, verse, active, wordContext) {
  if (tool.id === "strongs") {
    return {
      ...tool,
      current: active === "strongs",
      capabilityAvailable: ctx.canUseCapability?.("strongs-overlay") === true,
      dataAvailable: Boolean(wordContext?.token),
      unavailableKey: "strongs",
      dataUnavailableMessage: `Word detail is not available for ${reference}.`,
      run: () => ctx.detailViews.scrollStrongSection?.("word"),
    };
  }

  if (tool.id === "hebrew" || tool.id === "greek") {
    const section = tool.id;
    return {
      ...tool,
      current: false,
      capabilityAvailable: ctx.canUseCapability?.("strongs-overlay") === true,
      dataAvailable: wordContext?.sectionAvailability?.[section] === "present",
      unavailableKey: "strongs",
      dataUnavailableMessage: `${tool.label} is not available for this selected word.`,
      run: () => ctx.detailViews.scrollStrongSection?.(section),
    };
  }

  if (tool.id === "par") {
    return {
      ...tool,
      current: active === tool.id,
      capabilityAvailable: true,
      dataAvailable: Boolean(getVerseText(ctx, verse)),
      run: () =>
        void ctx.detailViews.showParallelVerse(reference, verse, getVerseText(ctx, verse), {
          history: "replace",
          lock: true,
          verse,
        }),
    };
  }

  if (tool.id === "refs") {
    return {
      ...tool,
      current: active === tool.id,
      capabilityAvailable: ctx.canUseCapability?.("crossrefs") === true,
      dataAvailable: Boolean(getCrossRecord(ctx, verse)),
      unavailableKey: "crossrefs",
      dataUnavailableMessage: `Cross-reference data is not available for ${reference}.`,
      run: () =>
        ctx.detailViews.showCrossrefs(reference, getCrossRecord(ctx, verse), {
          history: "replace",
          lock: true,
          verse,
        }),
    };
  }

  if (tool.id === "commentary") {
    return {
      ...tool,
      current: active === tool.id,
      capabilityAvailable: ctx.canUseCapability?.("commentary") === true,
      dataAvailable: true,
      unavailableKey: "commentary",
      run: () => void ctx.detailViews.showCommentary(reference, verse, { history: "replace", lock: true }),
    };
  }

  if (tool.id === "interlinear") {
    return {
      ...tool,
      current: active === tool.id,
      capabilityAvailable: ctx.canUseCapability?.("interlinear") === true,
      dataAvailable: hasInterlinear(ctx, verse),
      unavailableKey: "interlinear",
      dataUnavailableMessage: `Language Study data is not available for ${reference}.`,
      run: () => void ctx.detailViews.showInterlinearVerse(reference, verse, { history: "replace", lock: true }),
    };
  }

  return {
    ...tool,
    current: active === tool.id,
    capabilityAvailable: true,
    dataAvailable: Boolean(getVerseText(ctx, verse)),
    run: () =>
      ctx.detailViews.showTagEditor(reference, verse, getVerseText(ctx, verse), {
        history: "replace",
        lock: true,
      }),
  };
}

function appendActionButton(ctx, controls, action, reference, verse, wordContext) {
  const control = resolveControlState({
    capabilityAvailable: action.capabilityAvailable !== false,
    dataAvailable: action.dataAvailable !== false,
  });
  const scopeLabel = PANEL_SCOPE_LABELS[action.scope];
  const button = document.createElement("button");
  button.type = "button";
  button.className = action.current ? "verse-context-tab active" : "verse-context-tab";
  button.textContent = action.shortLabel;
  button.dataset.visibleLabel = action.label;
  button.dataset.panelScope = action.scope;
  button.dataset.controlState = control.state;
  button.dataset.unavailable = control.disabled ? "true" : "false";
  const reactivatableCurrentWord = action.id === "strongs" && action.current;
  button.disabled = control.disabled || (action.current && !reactivatableCurrentWord);
  button.setAttribute("aria-pressed", action.current ? "true" : "false");
  if (action.current) button.setAttribute("aria-current", "page");

  if (control.state === CONTROL_STATES.capabilityUnavailable && action.unavailableKey) {
    const unavailableMessage = studyUnavailableLabel(action.unavailableKey);
    button.title = unavailableMessage;
    button.setAttribute("aria-label", `${scopeLabel} scope, ${action.label}: ${unavailableMessage}`);
    button.setAttribute("aria-disabled", "true");
  } else if (control.state === CONTROL_STATES.dataUnavailable) {
    const unavailableMessage = action.dataUnavailableMessage || `Data is not available for ${reference}.`;
    button.title = unavailableMessage;
    button.setAttribute("aria-label", `${scopeLabel} scope, ${action.label}: ${unavailableMessage}`);
    button.setAttribute("aria-disabled", "true");
  } else if (action.current) {
    button.title = `Current ${scopeLabel.toLowerCase()} view: ${action.label}`;
    button.setAttribute("aria-label", `${scopeLabel} scope, current view: ${action.label} for ${reference}`);
  } else {
    button.title = `${scopeLabel} scope: ${action.label}`;
    button.setAttribute("aria-label", `${scopeLabel} scope, ${action.label} for ${reference}`);
  }

  if (action.run && (!action.current || reactivatableCurrentWord)) {
    button.addEventListener("click", () => {
      ctx.highlightReaderContext?.(
        action.scope === "word" ? wordHighlightOptions(wordContext, verse) : { verse, commit: true },
      );
      action.run();
    });
  }
  controls.append(button);
  return button;
}

function syncStrongSectionControl(button, section, availability, reference) {
  if (!button) return;
  const label = section === "hebrew" ? "Hebrew concordance" : "Greek concordance";
  const state = availability?.[section] || "absent";
  const loading = state === "loading";
  const present = state === "present";
  button.disabled = !present;
  button.setAttribute("aria-disabled", String(!present));
  button.dataset.controlState = loading ? "loading" : present ? CONTROL_STATES.enabled : CONTROL_STATES.dataUnavailable;
  button.dataset.unavailable = present || loading ? "false" : "true";
  if (loading) {
    const message = `${label} is loading for ${reference}`;
    button.title = message;
    button.setAttribute("aria-label", message);
  } else if (present) {
    const message = `Word scope: scroll to ${label.toLowerCase()} for ${reference}`;
    button.title = message;
    button.setAttribute("aria-label", message);
  } else {
    const message = `No ${label.toLowerCase()} section is available for the selected word in ${reference}`;
    button.title = message;
    button.setAttribute("aria-label", message);
  }
}

export function createVerseContextTabs(ctx, reference, verse, active, strongsContext = null) {
  const wordContext = resolveWordContext(ctx, strongsContext, verse);
  const hasWord = Boolean(wordContext?.token);
  const scopeOrder = panelScopeSequence({ word: hasWord, verse: true });

  const tabs = document.createElement("nav");
  tabs.className = "verse-context-tabs panel-context-navigation";
  tabs.dataset.scopeOrder = scopeOrder.join(" ");
  tabs.setAttribute("aria-label", `Contextual study tools for ${reference}`);

  const summary = document.createElement("div");
  summary.className = "panel-context-summary";
  summary.textContent = panelContextSummary({ reference, wordContext });
  tabs.append(summary);

  const groups = document.createElement("div");
  groups.className = "panel-context-groups";

  scopeOrder
    .filter((scope) => scope === "word" || scope === "verse")
    .forEach((scope) => {
      const { group, controls } = createScopeGroup(scope);
      panelToolsForScope(scope).forEach((tool) => {
        const button = appendActionButton(ctx, controls, actionForTool(ctx, tool, reference, verse, active, wordContext), reference, verse, wordContext);
        if (tool.id === "hebrew" || tool.id === "greek") button.dataset.strongSectionControl = tool.id;
      });

      if (scope === "word" && hasWord) {
        const sourceTarget = createSourceTokenTarget(
          { translation_id: ctx.state.translationId, book_id: ctx.state.bookId, chapter: ctx.state.chapter, verse },
          wordContext.token,
          ctx.state.translationId,
        );
        if (sourceTarget) controls.append(ctx.detailViews.renderStudyMarksTrigger(sourceTarget, { label: `selected source word in ${reference}`, onChange: () => { ctx.renderChapter(); ctx.syncFavoriteButtons?.(); } }));
      }
      if (scope === "verse") {
        const verseTarget = createVerseTarget({ translation_id: ctx.state.translationId, book_id: ctx.state.bookId, chapter: ctx.state.chapter, verse }, ctx.state.translationId);
        controls.append(ctx.detailViews.renderStudyMarksTrigger(verseTarget, { label: `verse ${reference}`, onChange: () => { ctx.renderChapter(); ctx.syncFavoriteButtons?.(); } }));
      }

      groups.append(group);
    });

  tabs.append(groups);
  tabs.updateStrongSectionAvailability = (availability) => {
    if (!hasWord) return;
    ["hebrew", "greek"].forEach((section) => {
      syncStrongSectionControl(tabs.querySelector(`[data-strong-section-control="${section}"]`), section, availability, reference);
    });
  };
  return tabs;
}
