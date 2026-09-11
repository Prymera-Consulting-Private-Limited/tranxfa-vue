import Transaction from "@/models/transaction.js";

/**
 * The money-safety rules from the Client API reference's "Error Handling"
 * page, in one place.
 *
 * "Never risk a double payment": if Confirm Quote or Retry Payment times out
 * or answers 5xx, the transaction may still have been created. Re-check the
 * transactions before retrying - retrying blindly is how a customer pays
 * twice. And "412 in the middle of checkout": the quote stays persisted, run
 * the MFA step, then confirm the same quote again.
 */

export const MFA_REQUIRED_TYPE = 'more_authentication_required';

const DRAFT_PREFIX = 'checkout-draft:';

// How far before the attempt a matching transaction may have been created
// and still count as ours. Clocks between phone and server drift.
const CREATED_SLACK_MS = 60_000;

/**
 * Whether a failed request may still have done its work on the server.
 *
 * A request that got an answer below 500 is settled: the server refused it.
 * A request that never got an answer (timeout, dropped connection) or was
 * answered 5xx may have been processed before the failure.
 *
 * @param {*} error an axios error
 * @returns {boolean}
 */
export function isOutcomeUnknown(error) {
    const status = error?.response?.status;
    if (status !== undefined && status !== null) {
        return status >= 500;
    }

    // Sent but never answered. An error with no request either was never
    // sent (a client-side throw) and so created nothing.
    return !! error?.request;
}

/**
 * The transaction a confirm attempt created, if it did.
 *
 * Matches by what the quote carries and the list returns: the recipient, the
 * paying currency, the sent amount, and a creation time no earlier than the
 * attempt. Anything else is somebody else's transfer.
 *
 * @param {{get: function}} transactionUtils
 * @param {object} quote a TransactionQuote
 * @param {number} attemptStartedAt epoch ms when the confirm was sent
 * @returns {Promise<Transaction|null>} rejects when the list itself cannot be fetched
 */
export async function findTransactionForQuote(transactionUtils, quote, attemptStartedAt) {
    const response = await transactionUtils.get(null, {recipient_id: quote?.recipient?.id ?? undefined, limit: 5});
    const rows = response?.data?.data ?? [];
    const since = attemptStartedAt - CREATED_SLACK_MS;

    for (const row of rows) {
        const transaction = Transaction.getInstance(row);
        if (matchesQuote(transaction, quote, since)) {
            return transaction;
        }
    }

    return null;
}

/**
 * @param {Transaction} transaction
 * @param {object} quote
 * @param {number} since epoch ms
 * @returns {boolean}
 */
export function matchesQuote(transaction, quote, since) {
    if (! transaction || ! quote) return false;
    if (transaction.recipient?.id !== quote.recipient?.id) return false;
    if (transaction.paymentCurrency?.id !== quote.paymentCurrency?.id) return false;
    if (Number(transaction.localAmount) !== Number(quote.localAmount)) return false;
    const createdAt = transaction.createdAt ? Date.parse(transaction.createdAt) : NaN;
    if (Number.isNaN(createdAt)) return false;

    return createdAt >= since;
}

/**
 * What the confirm step had chosen, kept across the MFA round trip.
 *
 * The quote itself is persisted by the API; the purpose, payment method and
 * payment details live only in the wizard, and the MFA screen is another
 * route. Session storage outlives the navigation and dies with the tab.
 */
export function saveCheckoutDraft(quoteId, draft) {
    try {
        sessionStorage.setItem(DRAFT_PREFIX + quoteId, JSON.stringify(draft));
    } catch (e) {
        // Storage can be unavailable (private mode, quota); the customer
        // then re-picks the purpose and method, which is the old behaviour.
    }
}

/**
 * @returns {object|null} the draft, removed from storage so it is used once
 */
export function takeCheckoutDraft(quoteId) {
    try {
        const raw = sessionStorage.getItem(DRAFT_PREFIX + quoteId);
        if (raw === null) return null;
        sessionStorage.removeItem(DRAFT_PREFIX + quoteId);

        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}
