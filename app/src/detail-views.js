import { createCommentaryOutlineViews } from "./views/commentary-outline-view.js?v=full-audit-20260701";
import { createInterlinearTranslationViews } from "./views/interlinear-translation-view.js?v=full-audit-20260701";
import { createJobsView } from "./views/jobs-view.js?v=full-audit-20260701";
import { createReferenceViews } from "./views/reference-view.js?v=full-audit-20260701";
import { createSearchView } from "./views/search-view.js?v=full-audit-20260701";
import { createStrongsView } from "./views/strongs-view.js?v=full-audit-20260701";
import { createTagsView } from "./views/tags-view.js?v=full-audit-20260701";
import { createUserDataView } from "./views/user-data-view.js?v=full-audit-20260701";
import { setDetail } from "./dom.js?v=full-audit-20260701";

export function createDetailViews(ctx) {
  const strongsView = createStrongsView(ctx);
  const commentaryOutlineViews = createCommentaryOutlineViews(ctx);
  const interlinearTranslationViews = createInterlinearTranslationViews(ctx, {
    appendLanguageBreakdown: strongsView.appendLanguageBreakdown,
    showStrong: strongsView.showStrong,
  });
  const jobsView = createJobsView(ctx);
  const referenceViews = createReferenceViews(ctx);
  const tagsView = createTagsView(ctx);

  return {
    clearStrongPin: strongsView.clearStrongPin,
    createFavoriteButton: tagsView.createFavoriteButton,
    renderInlineTagPicker: tagsView.renderInlineTagPicker,
    renderTagBadges: tagsView.renderTagBadges,
    renderTargetTagBadges: tagsView.renderTargetTagBadges,
    showCommentary: commentaryOutlineViews.showCommentary,
    showCrossrefs: referenceViews.showCrossrefs,
    showFootnote: referenceViews.showFootnote,
    showInterlinearChapter: interlinearTranslationViews.showInterlinearChapter,
    showInterlinearVerse: interlinearTranslationViews.showInterlinearVerse,
    showOutline: commentaryOutlineViews.showOutline,
    showTranslationVerseWorkspace: interlinearTranslationViews.showTranslationVerseWorkspace,
    showTranslationWorkspaceIndex: interlinearTranslationViews.showTranslationWorkspaceIndex,
    showParallelVerse: referenceViews.showParallelVerse,
    showSearch: createSearchView(ctx, { showStrong: strongsView.showStrong }),
    showStudyUnavailable: (title, node, options = {}) => setDetail(title, node, options),
    showStrong: strongsView.showStrong,
    showJobs: jobsView,
    showFavorites: tagsView.showFavorites,
    showTargetTagEditor: tagsView.showTargetTagEditor,
    showTagEditor: tagsView.showTagEditor,
    showTagIndex: tagsView.showTagIndex,
    showUserData: createUserDataView(ctx),
  };
}
