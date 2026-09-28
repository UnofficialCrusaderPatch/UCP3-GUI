/** Let in-game extensions follow the launcher language without changing game files. */
export default function withGuiLanguage(
  variables: Record<string, string>,
  language: string,
): Record<string, string> {
  // Windows environment names are case-insensitive. Remove differently cased
  // overrides too so the selected GUI language has one unambiguous value.
  return {
    ...Object.fromEntries(
      Object.entries(variables).filter(
        ([key]) => key.toUpperCase() !== 'UCP_GUI_LANGUAGE',
      ),
    ),
    UCP_GUI_LANGUAGE: language,
  };
}
