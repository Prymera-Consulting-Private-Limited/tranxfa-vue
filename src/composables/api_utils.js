/**
 * Surfaces a failure that is ours rather than the api's.
 *
 * A `.catch()` on a request catches everything after it too, so a model that
 * throws while mapping a perfectly good 200 lands in the same branch as a
 * network failure and renders as "something went wrong on our side" — true, but
 * useless. It cost the backend an evening: the response was intact, the retry
 * failed identically, and nothing reached the console because we had swallowed
 * the exception on the way to the error state.
 *
 * An axios error carries `response` for anything the server answered, and
 * `request` for anything that never got one. Neither means it came from us.
 *
 * @param {*} error
 * @param {string} context Where it happened, since the stack will point at axios.
 */
export function reportUnexpectedError(error, context) {
    if (error?.response || error?.request) {
        return;
    }

    console.error(`[${context}] failed while handling the response, not while making the request:`, error);
}

/**
 * A response's label dictionary, as a dictionary.
 *
 * PHP encodes an empty associative array as a JSON array, so an endpoint with no
 * labels yet answers `[]` where every other answer is an object. Most of that was
 * fixed at source, but one path still does it — the destinations early return on
 * a deployment with no hotel provider — and the failure is silent either way: a
 * lookup against an array returns undefined and falls through to our own wording,
 * so nothing errors and codes quietly render as nothing.
 *
 * @param {*} value
 * @returns {object}
 */
export function getLabels(value) {
    return value && !Array.isArray(value) ? value : {};
}

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
 * The `exception` key alone is not enough, though, and staging proved it: with
 * debug off the framework omits that key and answers with the bare message, so
 * "No query results for model [App\\Models\\VasOrder] a0000000-..." reached a
 * customer looking at a booking that did not exist. A namespaced class name in
 * square brackets is the framework's fingerprint - nothing anyone wrote for a
 * customer to read contains one - so the shape of the message is checked too.
 *
 * @param {object} error An axios error.
 * @returns {string|null}
 */

// `[App\Models\VasOrder]`, `[Illuminate\Auth\Access\AuthorizationException]`.
const FRAMEWORK_MESSAGE = /\[[A-Za-z_][\w]*(?:\\[A-Za-z_][\w]*)+]|^(?:No query results for model|Route \[|Target class|Call to (?:a member function|undefined)|Undefined (?:variable|property|array key)|SQLSTATE)/;

export function getCustomerMessage(error) {
    const data = error?.response?.data;

    if (!data || data.exception) {
        return null;
    }

    if (typeof data.message !== 'string' || data.message.length === 0) {
        return null;
    }

    return FRAMEWORK_MESSAGE.test(data.message) ? null : data.message;
}
