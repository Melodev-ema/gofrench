const englishLanguageNames = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });

export function isKnownLanguageCode(languageCode: string): boolean {
  return /^[a-z]{2}$/.test(languageCode) && englishLanguageNames.of(languageCode) !== undefined;
}

export function englishNameOfLanguage(languageCode: string): string {
  return englishLanguageNames.of(languageCode) ?? languageCode;
}
