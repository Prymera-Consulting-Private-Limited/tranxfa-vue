/**
 * The message an api failure is safe to show a customer, or null.
 *
 * Most of our endpoints write their failures for a customer to read — an expired
 * price, a room that has gone, a product that is not licensed — and those are far
 * better words than anything a client could invent. But that is only true where a
 * handler ran. An unhandled failure answers with the framework's own words, which
 * look like this:
 *
 *     No query results for model [App\Models\VasQuote] 00000000-…
 *
 * A debug payload is identified rather than guessed at: it carries the exception
 * class alongside the message, which no written message ever does. Validation
 * errors are unaffected, since they carry `errors` and a real sentence.
 *
 * @param {object} error An axios error.
 * @returns {string|null}
 */
export function getCustomerMessage(error) {
    const data = error?.response?.data;

    if (!data || data.exception) {
        return null;
    }

    return typeof data.message === 'string' && data.message.length ? data.message : null;
}
