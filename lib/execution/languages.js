/**
 * Supported languages. `judge0Id` matches Judge0 CE's language list
 * (Python 3.8, Java 13, C++ GCC 9.2, Node.js 12); override with
 * JUDGE0_LANGUAGE_IDS='{"python":92,...}' for other Judge0 builds.
 */
export const LANGUAGES = {
  python: { label: "Python 3", monaco: "python", judge0Id: 71, timeLimit: 3 },
  java: { label: "Java", monaco: "java", judge0Id: 62, timeLimit: 4 },
  cpp: { label: "C++", monaco: "cpp", judge0Id: 54, timeLimit: 2 },
  javascript: { label: "JavaScript", monaco: "javascript", judge0Id: 63, timeLimit: 3 },
};

export const LANGUAGE_KEYS = Object.keys(LANGUAGES);

export function judge0LanguageId(language) {
  try {
    const overrides = process.env.JUDGE0_LANGUAGE_IDS ? JSON.parse(process.env.JUDGE0_LANGUAGE_IDS) : {};
    return overrides[language] ?? LANGUAGES[language].judge0Id;
  } catch {
    return LANGUAGES[language].judge0Id;
  }
}
