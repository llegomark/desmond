/**
 * File validation utilities for upload validation
 * Centralized validation logic to prevent inconsistencies
 */

export interface FileValidationResult {
  valid: File[];
  errors: string[];
}

/**
 * Validates uploaded files against size and type restrictions
 * @param files - Array of files to validate
 * @returns Object containing valid files and error messages
 */
export const validateFiles = (files: File[]): FileValidationResult => {
  const valid: File[] = [];
  const errors: string[] = [];

  // Constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = ['image/', 'application/pdf'];

  files.forEach(file => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name} exceeds 50MB limit`);
      return;
    }

    // Check file type
    if (!ALLOWED_TYPES.some(type => file.type.startsWith(type))) {
      errors.push(`${file.name} is not an allowed file type (only images and PDFs are supported)`);
      return;
    }

    // File is valid
    valid.push(file);
  });

  return { valid, errors };
};

/**
 * Maximum allowed file size in bytes (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Allowed file type prefixes
 */
export const ALLOWED_FILE_TYPES = ['image/', 'application/pdf'];

/**
 * Checks if a single file is valid
 * @param file - File to check
 * @returns Error message if invalid, null if valid
 */
export const validateSingleFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} exceeds 50MB limit`;
  }

  if (!ALLOWED_FILE_TYPES.some(type => file.type.startsWith(type))) {
    return `${file.name} is not an allowed file type (only images and PDFs are supported)`;
  }

  return null;
};
