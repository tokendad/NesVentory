/**
 * Utility functions for the application
 */

import { getLocaleConfig } from './locale';
import type { Location } from './api';

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
 * Get the user's locale from configuration or browser settings
 * @returns The user's preferred locale
 */
export function getUserLocale(): string {
  const config = getLocaleConfig();
  return config.locale;
}

/**
 * Get the user's preferred currency from configuration
 * @returns The user's preferred currency code
 */
export function getUserCurrency(): string {
  const config = getLocaleConfig();
  return config.currency;
}

/**
 * Format a currency value according to the user's locale and currency preference
 * @param value - The numeric value to format
 * @param currency - The currency code (default: user's preferred currency)
 * @param locale - The locale to use (default: user's configured locale)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | null | undefined,
  currency?: string,
  locale?: string
): string {
  if (value == null || isNaN(value)) {
    return '—';
  }
  
  const userLocale = locale || getUserLocale();
  const userCurrency = currency || getUserCurrency();
  
  try {
    return new Intl.NumberFormat(userLocale, {
      style: 'currency',
      currency: userCurrency,
      // Let Intl API determine decimal places based on currency
      // (e.g., JPY and KRW use 0, USD uses 2)
    }).format(value);
  } catch (error) {
    // Fallback to USD if currency code is invalid
    return new Intl.NumberFormat(userLocale, {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }
}

/**
 * Format a date string or Date object according to the user's locale
 * @param date - The date string (YYYY-MM-DD) or Date object to format
 * @param options - Intl.DateTimeFormatOptions for customization
 * @param locale - The locale to use (default: user's configured locale)
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
 * @param locale - The locale to use (default: user's configured locale)
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

/**
 * Build the full hierarchical path for a location
 * @param locationId - The ID of the location to get the path for
 * @param locations - Array of all locations to build hierarchy from
 * @param separator - String to use as separator between path segments (default: " / ")
 * @returns Full path string (e.g., "Home1 / Floor 1 / Bathroom") or "—" if not found.
 *          If circular references are detected, returns partial path up to the cycle point.
 */
export function getLocationPath(
  locationId: number | string | null | undefined,
  locations: Location[],
  separator: string = " / "
): string {
  if (!locationId) return "—";
  
  // Build a Map for O(1) lookups instead of O(n) for each level
  const locationMap = new Map<string, Location>();
  for (const loc of locations) {
    locationMap.set(loc.id.toString(), loc);
  }
  
  // Find the location
  const location = locationMap.get(locationId.toString());
  if (!location) return "—";
  
  // Build path by traversing parent hierarchy
  const pathParts: string[] = [];
  let current: Location | undefined = location;
  const visited = new Set<string>(); // Prevent infinite loops from circular references
  
  while (current) {
    const currentId = current.id.toString();
    if (visited.has(currentId)) break; // Prevent circular reference - returns partial path
    visited.add(currentId);
    
    pathParts.unshift(current.friendly_name || current.name);
    
    if (current.parent_id != null) {
      const parentId = current.parent_id.toString();
      current = locationMap.get(parentId);
    } else {
      break;
    }
  }
  
  return pathParts.join(separator);
}
