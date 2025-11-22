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
