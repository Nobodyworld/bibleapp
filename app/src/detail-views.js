import { createCommentaryOutlineViews } from "./views/commentary-outline-view.js?v=pr13-live-qa-20260710c";
import { createInterlinearTranslationViews } from "./views/interlinear-translation-view.js?v=pr13-live-qa-20260710c";
import { createJobsView } from "./views/jobs-view.js?v=pr13-live-qa-20260710c";
import { createReferenceViews } from "./views/reference-view.js?v=pr13-live-qa-20260710c";
import { createSearchView } from "./views/search-view.js?v=pr13-live-qa-20260710c";
import { createStrongsView } from "./views/strongs-view.js?v=pr13-live-qa-20260710c";
import { createTagsView } from "./views/tags-view.js?v=pr13-live-qa-20260710c";
import { createUserDataView } from "./views/user-data-view.js?v=pr13-live-qa-20260710c";
import { setDetail } from "./dom.js?v=pr13-live-qa-20260710c";

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
    renderTargetTagPicker: tagsView.renderTargetTagPicker,
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
