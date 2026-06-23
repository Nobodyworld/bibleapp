import { createCommentaryOutlineViews } from "./views/commentary-outline-view.js?v=clean-app-v1-study-empty1";
import { createInterlinearTranslationViews } from "./views/interlinear-translation-view.js?v=clean-app-v1-study-empty1";
import { createJobsView } from "./views/jobs-view.js?v=clean-app-v1-runtime-boundary3";
import { createReferenceViews } from "./views/reference-view.js?v=clean-app-v1-runtime-boundary3";
import { createSearchView } from "./views/search-view.js?v=clean-app-v1-study-empty1";
import { createStrongsView } from "./views/strongs-view.js?v=clean-app-v1-strongs-bottom1";
import { createTagsView } from "./views/tags-view.js?v=clean-app-v1-runtime-boundary3";
import { createUserDataView } from "./views/user-data-view.js?v=clean-app-v1-runtime-boundary3";
import { setDetail } from "./dom.js?v=clean-app-v1-study-empty1";

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
    renderInlineTagPicker: tagsView.renderInlineTagPicker,
    renderTagBadges: tagsView.renderTagBadges,
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
    showTagEditor: tagsView.showTagEditor,
    showTagIndex: tagsView.showTagIndex,
    showUserData: createUserDataView(ctx),
  };
}
