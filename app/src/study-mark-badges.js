export function studyMarkBadgeOptions(options = {}) {
  return {
    ...options,
    includeFavorite: true,
  };
}

export function scopeStudyMarkLabel(options = {}) {
  if (options.id === "favoriteBook") return "Book";
  if (options.id === "favoriteChapter") return "Chapter";
  return "";
}
