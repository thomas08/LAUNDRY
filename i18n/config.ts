export const locales = ['en', 'th'] as const;
export type Locale = typeof locales[number];
// Thai is the operators' language — an English-first landing page meant every
// shift started with a trip to the language switcher.
export const defaultLocale: Locale = 'th';