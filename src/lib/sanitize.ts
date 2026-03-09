/**
 * Input sanitization utilities to prevent XSS, SQL injection, and script injection.
 * Apply these to all user inputs before submission.
 */

/** Strip HTML tags and trim whitespace */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>') // Decode common entities then re-strip
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove inline event handlers
    .trim();
}

/** Sanitize email - lowercase, trim, validate format */
export function sanitizeEmail(input: string): string {
  return input.toLowerCase().trim();
}

/** Sanitize phone - only digits and + allowed, max 15 chars */
export function sanitizePhone(input: string): string {
  return input.replace(/[^\d+\s-]/g, '').trim().slice(0, 15);
}

/** Sanitize numeric input - only digits and decimal point */
export function sanitizeNumeric(input: string): string {
  return input.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'); // allow only one decimal
}

/** Sanitize alphanumeric (for SEBI, PAN, etc.) */
export function sanitizeAlphanumeric(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
}

/** Sanitize general name input - letters, spaces, dots, hyphens only */
export function sanitizeName(input: string): string {
  return input.replace(/[^a-zA-Z\s.\-']/g, '').trim().slice(0, 100);
}

/** Sanitize textarea/long text - strip dangerous content but allow normal punctuation */
export function sanitizeTextarea(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, 2000);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate phone format (Indian) */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+91)?[6-9]\d{9}$/.test(cleaned) || /^\d{10}$/.test(cleaned);
}

/** Sanitize price - ensure positive integer */
export function sanitizePrice(input: string): number {
  const num = parseInt(input.replace(/[^\d]/g, ''), 10);
  return isNaN(num) || num < 0 ? 0 : num;
}
