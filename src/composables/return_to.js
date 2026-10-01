/**
 * A "come back here afterwards" path carried in a route query, as when a
 * customer is sent off to cancel the payment holding their account and then
 * returned to the one they were making.
 *
 * It arrives from the address bar, so it is only ever followed when it is a
 * path inside this app. Anything else - another origin, a protocol-relative
 * "//host", a scheme - is dropped, or the link becomes an open redirect that
 * somebody can dress up as ours.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
export function safeReturnTo(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
        return null;
    }

    return value;
}
