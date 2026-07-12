import { studyUnavailableLabel } from "../study-empty-state.js";
import { CONTROL_STATES, resolveControlState } from "../ui-contracts.js";
import {
  PANEL_SCOPE_LABELS,
  panelContextSummary,
  panelScopeSequence,
  panelToolsForScope,
} from "../panel-context-model.js";
import { resolveInterlinearVerseTokens } from "../strongs.js?v=pr13-live-qa-20260711e";
import { createVerseTarget } from "../semantic-targets.js?v=pr13-live-qa-20260711e";

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

function resolveWordContext(ctx, explicitContext, active, verse) {
  const candidate = explicitContext?.token ? explicitContext : ctx.studyContext?.strong;
  if (!candidate?.token) return null;
  if (active === "strongs") return candidate;
  const contextVerse = candidate.options?.verseContext?.verse;
  return contextVerse != null && String(contextVerse) === String(verse) ? candidate : null;
}

function createScopeGroup(scope) {
  const group = document.createElement("section");
  group.className = "panel-context-group";
  group.dataset.panelScope = scope;
  group.setAttribute("aria-label", `${PANEL_SCOPE_LABELS[scope]} scope`);

  const label = document.createElement("span");
  label.className = "panel-context-scope-label";
  label.textContent = PANEL_SCOPE_LABELS[scope];

  const controls = document.createElement("div");
  controls.className = "panel-context-controls";
  group.append(label, controls);
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
      run: () => {
        if (!wordContext?.token || !wordContext?.options) return;
        ctx.detailViews.showStrong(wordContext.token, {
          ...wordContext.options,
          force: true,
        });
      },
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
  button.disabled = control.disabled || action.current;
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

  if (action.run && !action.current) {
    button.addEventListener("click", () => {
      ctx.highlightReaderContext?.(
        action.scope === "word" ? wordHighlightOptions(wordContext, verse) : { verse, commit: true },
      );
      action.run();
    });
  }
  controls.append(button);
}

export function createVerseContextTabs(ctx, reference, verse, active, strongsContext = null) {
  const wordContext = resolveWordContext(ctx, strongsContext, active, verse);
  const hasWord = Boolean(wordContext?.token);
  const scopeOrder = panelScopeSequence({ word: hasWord, verse: true, chapter: true, book: true });

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
        appendActionButton(ctx, controls, actionForTool(ctx, tool, reference, verse, active, wordContext), reference, verse, wordContext);
      });

      if (scope === "verse") {
        const favorite = ctx.detailViews.createFavoriteButton(
          createVerseTarget(
            {
              translation_id: ctx.state.translationId,
              book_id: ctx.state.bookId,
              chapter: ctx.state.chapter,
              verse,
            },
            ctx.state.translationId,
          ),
          {
            className: "verse-context-favorite-button",
            label: reference,
            onChange: () => {
              ctx.renderChapter();
              ctx.syncFavoriteButtons?.();
            },
          },
        );
        favorite.dataset.panelScope = "verse";
        favorite.title = `Verse scope: Favorite ${reference}`;
        controls.append(favorite);
      }

      groups.append(group);
    });

  tabs.append(groups);
  return tabs;
}
