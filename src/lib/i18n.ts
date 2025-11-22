/**
 * Internationalization formatting utilities for dates, times, and currency
 */

/**
 * Format a date string according to the user's locale
 */
export function formatDate(
  dateString: string | null | undefined,
  locale?: string | null,
  timezone?: string | null
): string {
  if (!dateString) return "—";
  
  const effectiveLocale = locale || "en-US";
  const date = new Date(dateString);
  
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  
  if (timezone) {
    options.timeZone = timezone;
  }
  
  try {
    return new Intl.DateTimeFormat(effectiveLocale, options).format(date);
  } catch (e) {
    // Fallback if locale or timezone is invalid
    return new Intl.DateTimeFormat("en-US", { 
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  }
}

/**
 * Format a datetime string according to the user's locale
 */
export function formatDateTime(
  dateTimeString: string | null | undefined,
  locale?: string | null,
  timezone?: string | null
): string {
  if (!dateTimeString) return "—";
  
  const effectiveLocale = locale || "en-US";
  const date = new Date(dateTimeString);
  
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  
  if (timezone) {
    options.timeZone = timezone;
  }
  
  try {
    return new Intl.DateTimeFormat(effectiveLocale, options).format(date);
  } catch (e) {
    // Fallback if locale or timezone is invalid
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}

/**
 * Format a currency value according to the user's locale and currency
 */
export function formatCurrency(
  value: number | string | null | undefined,
  locale?: string | null,
  currency?: string | null
): string {
  if (value == null || value === "") return "—";
  
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "—";
  
  const effectiveLocale = locale || "en-US";
  const effectiveCurrency = currency || "USD";
  
  try {
    return new Intl.NumberFormat(effectiveLocale, {
      style: "currency",
      currency: effectiveCurrency,
    }).format(numValue);
  } catch (e) {
    // Fallback if locale or currency is invalid
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numValue);
  }
}

/**
 * Get a list of common locales
 */
export const COMMON_LOCALES = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "fr-CA", label: "Français (Canada)" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "es-MX", label: "Español (México)" },
  { value: "it-IT", label: "Italiano (Italia)" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "nl-NL", label: "Nederlands (Nederland)" },
  { value: "sv-SE", label: "Svenska (Sverige)" },
  { value: "nb-NO", label: "Norsk (Norge)" },
  { value: "da-DK", label: "Dansk (Danmark)" },
  { value: "fi-FI", label: "Suomi (Suomi)" },
  { value: "pl-PL", label: "Polski (Polska)" },
  { value: "ru-RU", label: "Русский (Россия)" },
  { value: "ja-JP", label: "日本語 (日本)" },
  { value: "ko-KR", label: "한국어 (대한민국)" },
  { value: "zh-CN", label: "中文 (中国)" },
  { value: "zh-TW", label: "中文 (台灣)" },
];

/**
 * Get a list of common currencies
 */
export const COMMON_CURRENCIES = [
  { value: "USD", label: "USD - US Dollar ($)" },
  { value: "EUR", label: "EUR - Euro (€)" },
  { value: "GBP", label: "GBP - British Pound (£)" },
  { value: "CAD", label: "CAD - Canadian Dollar ($)" },
  { value: "AUD", label: "AUD - Australian Dollar ($)" },
  { value: "JPY", label: "JPY - Japanese Yen (¥)" },
  { value: "CNY", label: "CNY - Chinese Yuan (¥)" },
  { value: "CHF", label: "CHF - Swiss Franc (Fr)" },
  { value: "SEK", label: "SEK - Swedish Krona (kr)" },
  { value: "NOK", label: "NOK - Norwegian Krone (kr)" },
  { value: "DKK", label: "DKK - Danish Krone (kr)" },
  { value: "PLN", label: "PLN - Polish Złoty (zł)" },
  { value: "RUB", label: "RUB - Russian Ruble (₽)" },
  { value: "BRL", label: "BRL - Brazilian Real (R$)" },
  { value: "MXN", label: "MXN - Mexican Peso ($)" },
  { value: "INR", label: "INR - Indian Rupee (₹)" },
  { value: "KRW", label: "KRW - South Korean Won (₩)" },
];

/**
 * Get a list of common timezones
 */
export const COMMON_TIMEZONES = [
  { value: "Etc/UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris, Berlin, Rome" },
  { value: "Europe/Moscow", label: "Moscow" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Beijing, Shanghai" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Melbourne", label: "Melbourne" },
  { value: "Pacific/Auckland", label: "Auckland" },
];
