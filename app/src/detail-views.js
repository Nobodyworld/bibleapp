import { clearActiveWordContext, getActiveWordContext, setActiveWordContext } from "./active-word-context.js?v=pr13-live-qa-20260711e";
import { createCommentaryOutlineViews } from "./views/commentary-outline-view.js?v=pr13-live-qa-20260711e";
import { createInterlinearTranslationViews } from "./views/interlinear-translation-view.js?v=pr13-live-qa-20260711e";
import { createJobsView } from "./views/jobs-view.js?v=pr13-live-qa-20260711e";
import { createReferenceViews } from "./views/reference-view.js?v=pr13-live-qa-20260711e";
import { createSearchView } from "./views/search-view.js?v=pr13-live-qa-20260711e";
import { createStrongsView } from "./views/strongs-view.js?v=pr13-live-qa-20260711e";
import { createTagsView } from "./views/tags-view.js?v=pr13-live-qa-20260711e";
import { createUserDataView } from "./views/user-data-view.js?v=pr13-live-qa-20260711e";
import { studyMarkBadgeOptions } from "./study-mark-badges.js";
import { setDetail } from "./dom.js?v=pr13-live-qa-20260711e";

export function createDetailViews(ctx) {
  ctx.getActiveWordContext = (verse = null) => getActiveWordContext(ctx, verse);
  ctx.setActiveWordContext = (context) => setActiveWordContext(ctx, context);
  ctx.clearActiveWordContext = () => clearActiveWordContext(ctx);

  const strongsCtx = Object.create(ctx);
  Object.defineProperty(strongsCtx, "studyContext", {
    value: null,
    writable: false,
  });
  const strongsView = createStrongsView(strongsCtx);
  const showStrong = (token, options = {}) => {
    if (options.verseContext && !options.hover) {
      ctx.setActiveWordContext({
        token,
        options,
      });
    }
    return strongsView.showStrong(token, options);
  };

  const commentaryOutlineViews = createCommentaryOutlineViews(ctx);
  const interlinearTranslationViews = createInterlinearTranslationViews(ctx, {
    appendLanguageBreakdown: strongsView.appendLanguageBreakdown,
    showStrong,
    scrollStrongSection: strongsView.scrollStrongSection,
  });
  const jobsView = createJobsView(ctx);
  const referenceViews = createReferenceViews(ctx);
  const tagsView = createTagsView(ctx);

  return {
    clearStrongPin: strongsView.clearStrongPin,
    createFavoriteButton: tagsView.createFavoriteButton,
    createStudyMarksIcon: tagsView.createStudyMarksIcon,
    renderInlineTagPicker: tagsView.renderInlineTagPicker,
    renderTagBadges: tagsView.renderTagBadges,
    renderTargetTagPicker: tagsView.renderTargetTagPicker,
    renderStudyMarksTrigger: tagsView.renderStudyMarksTrigger,
    renderTargetTagBadges: (target, options = {}) =>
      tagsView.renderTargetTagBadges(target, studyMarkBadgeOptions(options)),
    showCommentary: commentaryOutlineViews.showCommentary,
    showCrossrefs: referenceViews.showCrossrefs,
    showFootnote: referenceViews.showFootnote,
    showInterlinearChapter: interlinearTranslationViews.showInterlinearChapter,
    showInterlinearVerse: interlinearTranslationViews.showInterlinearVerse,
    showOutline: commentaryOutlineViews.showOutline,
    showTranslationVerseWorkspace: interlinearTranslationViews.showTranslationVerseWorkspace,
    showTranslationWorkspaceIndex: interlinearTranslationViews.showTranslationWorkspaceIndex,
    showParallelVerse: referenceViews.showParallelVerse,
    showSearch: createSearchView(ctx, { showStrong }),
    showStudyUnavailable: (title, node, options = {}) => setDetail(title, node, options),
    showStrong,
    scrollStrongSection: strongsView.scrollStrongSection,
    showJobs: jobsView,
    showFavorites: tagsView.showFavorites,
    showTargetTagEditor: tagsView.showTargetTagEditor,
    showTagEditor: tagsView.showTagEditor,
    showTagIndex: tagsView.showTagIndex,
    showUserData: createUserDataView(ctx),
  };
}
