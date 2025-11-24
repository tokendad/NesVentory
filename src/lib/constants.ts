/**
 * Application constants
 */

export const PHOTO_TYPES = {
  DEFAULT: "default",
  DATA_TAG: "data_tag",
  RECEIPT: "receipt",
  WARRANTY: "warranty",
  OPTIONAL: "optional",
  PROFILE: "profile",
} as const;

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

// Relationship types for Living items
export const RELATIONSHIP_TYPES = {
  // Family relationships
  SELF: "self",
  SPOUSE: "spouse",
  PARTNER: "partner",
  MOTHER: "mother",
  FATHER: "father",
  SISTER: "sister",
  BROTHER: "brother",
  DAUGHTER: "daughter",
  SON: "son",
  GRANDMOTHER: "grandmother",
  GRANDFATHER: "grandfather",
  AUNT: "aunt",
  UNCLE: "uncle",
  COUSIN: "cousin",
  NIECE: "niece",
  NEPHEW: "nephew",
  // Other living things
  PET: "pet",
  PLANT: "plant",
  OTHER: "other",
} as const;

// Human-readable labels for relationship types
export const RELATIONSHIP_LABELS: Record<string, string> = {
  self: "Self (Me)",
  spouse: "Spouse",
  partner: "Partner",
  mother: "Mother",
  father: "Father",
  sister: "Sister",
  brother: "Brother",
  daughter: "Daughter",
  son: "Son",
  grandmother: "Grandmother",
  grandfather: "Grandfather",
  aunt: "Aunt",
  uncle: "Uncle",
  cousin: "Cousin",
  niece: "Niece",
  nephew: "Nephew",
  pet: "Pet",
  plant: "Plant",
  other: "Other",
};

// Living tag name constant
export const LIVING_TAG_NAME = "Living";
