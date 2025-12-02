/**
 * Shared type definitions for the application
 */

export interface PhotoUpload {
  file: File;
  preview: string;
  type: string;
}

export type DocumentUpload = 
  | { file: File; url?: never; type: string }
  | { file?: never; url: string; type: string };
