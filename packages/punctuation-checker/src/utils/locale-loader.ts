export type LocaleLoader = (language: string) => Promise<unknown>;

/**
 * Available checker types that have locale support.
 * These correspond directly to the directory names in the src folder.
 */
export type CheckerType = 'allowed-character' | 'quotation' | 'punctuation-context' | 'paired-punctuation' | 'fixes';

/**
 * Creates a bundler-safe locale loader with fallback to 'en'.
 * @param checkerType - The type of checker to create a locale loader for
 * @returns A locale loader function that can load locales for the specified checker
 */
export function createLocaleLoader(checkerType: CheckerType): LocaleLoader {
  return async (language: string) => {
    try {
      return await import(`../${checkerType}/locales/${language}.json`, { with: { type: 'json' } });
    } catch {
      return await import(`../${checkerType}/locales/en.json`, { with: { type: 'json' } });
    }
  };
}
