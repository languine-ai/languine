export function getLanguageName(locale: string) {
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
    const languageCode = locale.split("-")[0];

    return displayNames.of(languageCode) || locale;
  } catch (error) {
    return locale;
  }
}
