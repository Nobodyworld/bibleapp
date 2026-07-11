import { studyUnavailableLabel } from "../study-empty-state.js";
import { CONTROL_STATES, resolveControlState } from "../ui-contracts.js";
import { resolveInterlinearVerseTokens } from "../strongs.js?v=pr13-live-qa-20260710c";
import { createVerseTarget } from "../semantic-targets.js?v=pr13-live-qa-20260710c";

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

export function createVerseContextTabs(ctx, reference, verse, active, strongsContext = null) {
  const tabs = document.createElement("div");
  tabs.className = "verse-context-tabs";
  tabs.setAttribute("aria-label", `Study tools for ${reference}`);

  const actions = [];

  if (active === "strongs") {
    actions.push({
      id: "strongs",
      label: "Word",
      disabled: true,
    });
  } else if (strongsContext?.token && strongsContext?.options) {
    // If not on Word tab but there's a stored Strong's context, show Word as clickable
    actions.push({
      id: "strongs",
      label: "Word",
      disabled: false,
      run: () => {
        ctx.detailViews.showStrong(strongsContext.token, {
          ...strongsContext.options,
          history: "replace",
        });
      },
    });
  }

  actions.push(
    {
      id: "par",
      label: "Par",
      capabilityAvailable: true,
      dataAvailable: Boolean(getVerseText(ctx, verse)),
      run: () => void ctx.detailViews.showParallelVerse(reference, verse, getVerseText(ctx, verse), { history: "replace", lock: true, verse }),
    },
    {
      id: "refs",
      label: "Refs",
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
    },
    {
      id: "commentary",
      label: "Cmt",
      capabilityAvailable: ctx.canUseCapability?.("commentary") === true,
      dataAvailable: true,
      unavailableKey: "commentary",
      run: () => void ctx.detailViews.showCommentary(reference, verse, { history: "replace", lock: true }),
    },
    {
      id: "interlinear",
      label: "Int",
      capabilityAvailable: ctx.canUseCapability?.("interlinear") === true,
      dataAvailable: hasInterlinear(ctx, verse),
      unavailableKey: "interlinear",
      dataUnavailableMessage: `Interlinear data is not available for ${reference}.`,
      run: () => void ctx.detailViews.showInterlinearVerse(reference, verse, { history: "replace", lock: true }),
    },
    {
      id: "tags",
      label: "Tags",
      capabilityAvailable: true,
      dataAvailable: Boolean(getVerseText(ctx, verse)),
      run: () => ctx.detailViews.showTagEditor(reference, verse, getVerseText(ctx, verse), { history: "replace", lock: true }),
    },
  );

  actions.forEach((action) => {
    const control =
      typeof action.disabled === "boolean"
        ? {
            state: action.disabled ? CONTROL_STATES.dataUnavailable : CONTROL_STATES.enabled,
            disabled: action.disabled,
          }
        : resolveControlState({
            capabilityAvailable: action.capabilityAvailable !== false,
            dataAvailable: action.dataAvailable !== false,
          });
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.id === active ? "verse-context-tab active" : "verse-context-tab";
    button.textContent = action.label;
    button.disabled = control.disabled;
    button.dataset.controlState = control.state;
    button.dataset.unavailable = control.disabled ? "true" : "false";

    if (control.state === CONTROL_STATES.capabilityUnavailable && action.unavailableKey) {
      const unavailableMessage = studyUnavailableLabel(action.unavailableKey);
      button.title = unavailableMessage;
      button.setAttribute("aria-label", `${action.label}: ${unavailableMessage}`);
      button.setAttribute("aria-disabled", "true");
    } else if (control.state === CONTROL_STATES.dataUnavailable) {
      const unavailableMessage = action.dataUnavailableMessage || `Data is not available for ${reference}.`;
      button.title = unavailableMessage;
      button.setAttribute("aria-label", `${action.label}: ${unavailableMessage}`);
      button.setAttribute("aria-disabled", "true");
    } else {
      button.setAttribute("aria-label", `${action.label}: Study tools for ${reference}`);
    }

    button.setAttribute("aria-pressed", action.id === active ? "true" : "false");
    if (action.run) {
      button.addEventListener("click", () => {
        ctx.highlightReaderContext?.({ verse, commit: true });
        action.run();
      });
    }
    tabs.append(button);
  });

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
  tabs.append(favorite);

  return tabs;
}
