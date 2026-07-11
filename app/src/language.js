function codePointKey(char) {
  return `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
}

function isHebrewLetter(char) {
  const code = char.codePointAt(0);
  return code >= 0x05d0 && code <= 0x05ea;
}

function isGreekLetter(char) {
  const code = char.codePointAt(0);
  return (
    (code >= 0x0370 && code <= 0x03ff) ||
    (code >= 0x1f00 && code <= 0x1fff && !isKnownGreekMarkCode(code))
  );
}

function isKnownGreekMarkCode(code) {
  return (code >= 0x0300 && code <= 0x036f) || code === 0x1fbd;
}

function isHebrewMarkCode(code) {
  return code >= 0x0591 && code <= 0x05c7;
}

function isLanguageLetter(char, language) {
  return language === "hebrew" ? isHebrewLetter(char) : isGreekLetter(char);
}

function isLanguageMark(char, language) {
  const code = char.codePointAt(0);
  return language === "hebrew" ? isHebrewMarkCode(code) : isKnownGreekMarkCode(code);
}

function createAlphabetIndex(alphabet) {
  const index = new Map();
  for (const item of alphabet?.letters || []) {
    [item.letter, item.uppercase, item.lowercase, ...(item.alternate_forms || [])]
      .filter(Boolean)
      .forEach((char) => index.set(char.normalize("NFD"), item));

    if (item.final_form) {
      index.set(item.final_form.normalize("NFD"), {
        ...item,
        letter: item.final_form,
        base_letter: item.letter,
        name: item.final_name || `${item.name} Sofit`,
        gematria: item.final_gematria || item.gematria,
        standard_gematria: item.gematria,
        final_form_of: item.name,
      });
    }
  }
  return index;
}

function createMarkIndex(marks) {
  return new Map((marks?.marks || []).map((item) => [item.code_point, item]));
}

export function gematriaValueForUnit(unit) {
  const letter = unit?.letter;
  if (!letter) return 0;
  const char = String(unit?.char || "").normalize("NFD");
  const finalForm = String(letter.final_form || letter.letter || "").normalize("NFD");
  const finalValue = Number(letter.final_gematria || 0);
  if (finalValue && (letter.final_form_of || (finalForm && char === finalForm))) {
    return finalValue;
  }
  return Number(letter.gematria || 0);
}

export function wordHasLanguageScript(word, language) {
  return Array.from(String(word || "").normalize("NFD")).some((char) => isLanguageLetter(char, language));
}

export function analyzeOriginalWord(word, language, metadata) {
  const normalized = String(word || "").normalize("NFD");
  const alphabetIndex = createAlphabetIndex(metadata?.alphabet);
  const markIndex = createMarkIndex(metadata?.marks);
  const units = [];
  const unknownMarks = [];
  let current = null;

  for (const char of Array.from(normalized)) {
    if (isLanguageLetter(char, language)) {
      const letter = alphabetIndex.get(char) || null;
      current = {
        char,
        code_point: codePointKey(char),
        letter,
        marks: [],
      };
      units.push(current);
      continue;
    }

    if (isLanguageMark(char, language)) {
      const key = codePointKey(char);
      const mark = markIndex.get(key) || null;
      const record = {
        char,
        code_point: key,
        mark,
      };
      if (!mark) unknownMarks.push(record);
      if (current && char.match(/\p{Mark}/u)) {
        current.marks.push(record);
      } else {
        current = null;
        units.push({ char, code_point: key, letter: null, marks: [record], standalone: true });
      }
      continue;
    }

    if (!char.trim()) {
      current = null;
    }
  }

  const gematriaTotal =
    language === "hebrew"
      ? units.reduce((sum, unit) => sum + gematriaValueForUnit(unit), 0)
      : null;

  return {
    word,
    language,
    gematria_total: gematriaTotal,
    units,
    unknown_marks: unknownMarks,
  };
}

export function languageUnitDisplayGlyph(unit) {
  const marks = (unit?.marks || []).map((record) => record?.char || "").filter(Boolean);
  if (unit?.standalone && marks[0] === unit?.char) {
    const standalone = marks.join("");
    return standalone.match(/^\p{Mark}/u) ? `◌${standalone}`.normalize("NFC") : standalone.normalize("NFC");
  }
  return `${unit?.char || ""}${marks.join("")}`.normalize("NFC");
}

export function summarizeHebrewGematriaTokens(tokens, metadata) {
  const hebrewTokens = (tokens || []).filter(
    (token) =>
      token.language === "hebrew" &&
      token.original &&
      wordHasLanguageScript(token.original, "hebrew"),
  );
  if (!hebrewTokens.length || !metadata) return null;
  const total = hebrewTokens.reduce((sum, token) => {
    const analysis = analyzeOriginalWord(token.original, "hebrew", metadata);
    return sum + Number(analysis.gematria_total || 0);
  }, 0);
  return total > 0 ? { total, tokens: hebrewTokens } : null;
}
