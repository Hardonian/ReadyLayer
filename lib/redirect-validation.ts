/**
 * Redirect URL Validation Utilities
 *
 * Prevents open redirect vulnerabilities by validating redirect URLs
 * to ensure they only redirect to internal paths within the application.
 */

/**
 * Validates a redirect path to prevent open redirect vulnerabilities.
 * Only allows relative paths that start with `/` and do not contain protocol-relative URLs.
 *
 * @param path - The redirect path to validate
 * @returns true if the path is safe to use for redirection, false otherwise
 *
 * @example
 * isValidRedirectPath('/dashboard') // true
 * isValidRedirectPath('/dashboard/repos') // true
 * isValidRedirectPath('//evil.com') // false
 * isValidRedirectPath('https://evil.com') // false
 * isValidRedirectPath('/javascript:alert(1)') // false
 */
export function isValidRedirectPath(path: string): boolean {
  // Must start with `/` (relative path)
  if (!path.startsWith('/')) {
    return false;
  }

  // Must not start with `//` (protocol-relative URL)
  if (path.startsWith('//')) {
    return false;
  }

  // Must not contain common protocol prefixes (defense in depth)
  // Prevents /javascript:, /data:, /vbscript:, etc.
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(path)) {
    return false;
  }

  // Must not contain newlines or null bytes (injection protection)
  if (/[\r\n\0]/.test(path)) {
    return false;
  }

  return true;
}

/**
 * Validates and sanitizes a redirect path, returning a safe default if invalid.
 *
 * @param path - The redirect path to validate
 * @param defaultPath - The default path to return if validation fails (default: '/')
 * @returns A safe redirect path
 *
 * @example
 * sanitizeRedirectPath('/dashboard') // '/dashboard'
 * sanitizeRedirectPath('//evil.com') // '/'
 * sanitizeRedirectPath('https://evil.com', '/dashboard') // '/dashboard'
 */
export function sanitizeRedirectPath(path: string | null | undefined, defaultPath = '/'): string {
  if (!path) {
    return defaultPath;
  }

  return isValidRedirectPath(path) ? path : defaultPath;
}

/**
 * Validates a return URL from OAuth state or query parameters.
 * Uses a whitelist of allowed path prefixes for additional security.
 *
 * @param returnUrl - The return URL to validate
 * @param allowedPrefixes - Array of allowed path prefixes (default: ['/dashboard', '/'])
 * @param defaultPath - The default path if validation fails (default: '/dashboard')
 * @returns A safe return URL
 *
 * @example
 * validateReturnUrl('/dashboard/repos') // '/dashboard/repos'
 * validateReturnUrl('/dashboard/repos', ['/dashboard']) // '/dashboard/repos'
 * validateReturnUrl('/admin', ['/dashboard']) // '/dashboard' (prefix not allowed)
 * validateReturnUrl('//evil.com') // '/dashboard'
 */
export function validateReturnUrl(
  returnUrl: string | null | undefined,
  allowedPrefixes: string[] = ['/dashboard', '/'],
  defaultPath = '/dashboard'
): string {
  if (!returnUrl) {
    return defaultPath;
  }

  // First check basic redirect path validation
  if (!isValidRedirectPath(returnUrl)) {
    return defaultPath;
  }

  // Check against allowed prefixes
  const isAllowedPrefix = allowedPrefixes.some(prefix => {
    // Exact match or starts with prefix followed by '/' or end of string
    return returnUrl === prefix || returnUrl.startsWith(`${prefix}/`);
  });

  if (!isAllowedPrefix) {
    return defaultPath;
  }

  return returnUrl;
}
