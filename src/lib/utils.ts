/**
 * Utility functions for the application
 */

/**
 * Format photo type name for display
 * @param photoType - The photo type string (e.g., "data_tag", "receipt")
 * @returns Formatted photo type name with proper capitalization
 */
export function formatPhotoType(photoType: string | null | undefined): string {
  if (!photoType) return "Photo";
  return photoType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get the user's locale from browser settings or default to 'en-US'
 * @returns The user's preferred locale
 */
export function getUserLocale(): string {
  return navigator.language || 'en-US';
}

/**
 * Format a currency value according to the user's locale
 * @param value - The numeric value to format
 * @param currency - The currency code (default: 'USD')
 * @param locale - The locale to use (default: user's browser locale)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'USD',
  locale?: string
): string {
  if (value == null || isNaN(value)) {
    return '—';
  }
  
  const userLocale = locale || getUserLocale();
  
  try {
    return new Intl.NumberFormat(userLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    // Fallback to USD if currency code is invalid
    return new Intl.NumberFormat(userLocale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

/**
 * Format a date string or Date object according to the user's locale
 * @param date - The date string (YYYY-MM-DD) or Date object to format
 * @param options - Intl.DateTimeFormatOptions for customization
 * @param locale - The locale to use (default: user's browser locale)
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  if (!date) {
    return '—';
  }
  
  const userLocale = locale || getUserLocale();
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(userLocale, options || defaultOptions).format(dateObj);
  } catch (error) {
    // Fallback to original string if parsing fails
    return typeof date === 'string' ? date : '—';
  }
}

/**
 * Format a date and time according to the user's locale
 * @param dateTime - The datetime string or Date object to format
 * @param locale - The locale to use (default: user's browser locale)
 * @returns Formatted datetime string
 */
export function formatDateTime(
  dateTime: string | Date | null | undefined,
  locale?: string
): string {
  if (!dateTime) {
    return '—';
  }
  
  const userLocale = locale || getUserLocale();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  
  try {
    const dateObj = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return new Intl.DateTimeFormat(userLocale, options).format(dateObj);
  } catch (error) {
    return typeof dateTime === 'string' ? dateTime : '—';
  }
}
