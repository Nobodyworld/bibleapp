export const DATA_ROOT = "./data";

export const DEFAULT_ROUTE = {
  translationId: "bsb",
  bookId: "psalms",
  chapter: "23",
  verse: null,
};

export const STORAGE_KEYS = {
  tags: "bibleapp:verse-tags:v1",
  workspace: "bibleapp:translation-workspace:v1",
  assertions: "bibleapp:assertions:v1",
  polls: "bibleapp:polls:v1",
  packages: "bibleapp:packages:v1",
  importBackups: "bibleapp:import-backups:v1",
};

export const DEFAULT_TAGS = [
  {
    id: "positive_sentiment",
    label: "Positive",
    description: "Positive sentiment",
    color: "#1f7a4d",
    icon: "+",
  },
  {
    id: "negative_sentiment",
    label: "Negative",
    description: "Negative sentiment",
    color: "#a33a3a",
    icon: "-",
  },
  {
    id: "command_declaration",
    label: "Command/Declaration",
    description: "Command, instruction, or declaration",
    color: "#7a5c12",
    icon: "!",
  },
  {
    id: "question",
    label: "Question",
    description: "Question or question-mark verse",
    color: "#315f99",
    icon: "?",
  },
];

export const JOB_TYPES = {
  tagIndexRefresh: "tag-index-refresh",
  translationEditAnalysis: "translation-edit-analysis",
  personalGlossaryBuild: "personal-glossary-build",
  wordMapRefresh: "word-map-refresh",
};
