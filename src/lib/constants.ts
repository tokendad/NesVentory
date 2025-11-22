/**
 * Application constants
 */

export const PHOTO_TYPES = {
  DEFAULT: "default",
  DATA_TAG: "data_tag",
  RECEIPT: "receipt",
  WARRANTY: "warranty",
  OPTIONAL: "optional",
} as const;

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
