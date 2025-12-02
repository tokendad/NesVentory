/**
 * Shared type definitions for the application
 */

export interface PhotoUpload {
  file: File;
  preview: string;
  type: string;
}

export interface DocumentUpload {
  file?: File;
  url?: string;
  type: string;
}
