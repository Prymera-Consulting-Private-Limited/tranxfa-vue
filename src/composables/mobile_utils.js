/**
 * National mobile digits only (no spaces, dashes, or leading +).
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
export function cleanNationalMobileNumber(value) {
  if (value == null || value === '') return ''
  return String(value).replace(/\D/g, '')
}
