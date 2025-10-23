import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // Use default locale if none provided
  const validLocale = locale || 'en';

  // Validate that the locale is supported
  const supportedLocales = ['en', 'th'];
  const safeLocale = supportedLocales.includes(validLocale) ? validLocale : 'en';

  try {
    const messages = (await import(`../messages/${safeLocale}.json`)).default;
    return {
      locale: safeLocale,
      messages
    };
  } catch (error) {
    console.error('Failed to load messages for locale:', safeLocale, error);
    // Fallback to English with empty messages if there's an issue
    try {
      const fallbackMessages = (await import(`../messages/en.json`)).default;
      return {
        locale: 'en',
        messages: fallbackMessages
      };
    } catch (fallbackError) {
      console.error('Failed to load fallback messages:', fallbackError);
      return {
        locale: 'en',
        messages: {}
      };
    }
  }
});