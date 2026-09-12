import i18n from '@/i18n.js';

// A module, not a component, so it reaches the catalogue through the global
// instance rather than through useI18n().
const t = (...args) => i18n.global.t(...args);

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

/**
 * The messages in a Laravel validation error bag that do not belong to a
 * field with its own place on screen.
 *
 * @param {object|Array|null} errors `response.data.errors`
 * @param {string} fieldPrefix keys starting with this are rendered elsewhere
 * @returns {string[]}
 */
export function fieldlessErrors(errors, fieldPrefix) {
    if (! errors || typeof errors !== 'object') {
        return [];
    }

    return Object.entries(errors)
        .filter(([key]) => ! key.startsWith(fieldPrefix))
        .flatMap(([, messages]) => (Array.isArray(messages) ? messages : [messages]))
        .filter(message => typeof message === 'string' && message.length > 0);
}

/**
 * Logs a failed request without its body.
 *
 * `console.error(e)` on an axios error prints the whole error, and
 * `e.config.data` is the serialised request: on the sign-in, sign-up and OTP
 * screens that is the customer's password or code, kept in the console for
 * as long as it is open.
 *
 * @param {*} error
 * @param {string} context
 */
export function logRequestFailure(error, context) {
    if (! error?.response && ! error?.request) {
        reportUnexpectedError(error, context);
        return;
    }

    console.error(`[${context}] ${error.config?.method?.toUpperCase() ?? ''} ${error.config?.url ?? ''} -> ${error.response?.status ?? 'no response'}`);
}

/**
 * A sentence the customer can act on when a request fails.
 *
 * Every silent `.catch(console.error)` in the audit had the same shape: the
 * button re-enabled and nothing was said. This turns the error into one line
 * for the screen. The fallback is the caller's own wording for "it did not
 * work" and should say what did not happen and whether money moved.
 *
 * @param {*} error
 * @param {string} fallback
 * @returns {string}
 */
/**
 * How long a 429 asks the client to wait, from its Retry-After header
 * (seconds, or an HTTP date). Null when the header is absent or unreadable.
 *
 * @param {*} error an axios error
 * @returns {number|null} whole seconds, never below 1
 */
export function retryAfterSeconds(error) {
    const raw = error?.response?.headers?.['retry-after'];
    if (raw === undefined || raw === null || raw === '') {
        return null;
    }
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) {
        return Math.max(1, Math.ceil(asNumber));
    }
    const asDate = Date.parse(raw);
    if (Number.isNaN(asDate)) {
        return null;
    }

    return Math.max(1, Math.ceil((asDate - Date.now()) / 1000));
}

export function failureMessage(error, fallback) {
    if (error?.request && ! error?.response) {
        return t('common.connectionFailed');
    }

    const status = error?.response?.status;

    if (status === 429) {
        const seconds = retryAfterSeconds(error);
        if (seconds !== null) {
            return t('common.tooManyTriesSeconds', seconds, {count: seconds});
        }

        return t('common.tooManyTries');
    }

    if (status === 401 || status === 419) {
        return t('common.sessionEnded');
    }

    if (status === 422) {
        return getCustomerMessage(error) ?? fieldlessErrors(error.response?.data?.errors, ' ')[0] ?? fallback;
    }

    if (status >= 500) {
        return fallback;
    }

    return getCustomerMessage(error) ?? fallback;
}
