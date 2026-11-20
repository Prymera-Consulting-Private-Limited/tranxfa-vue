import PaymentState from "@/enums/payment_state.js";

/**
 * The marketing events app.xenvia.eu sends, in one place (SD-2059).
 *
 * Each event goes to whichever tags are present:
 * - **The Google tag** is always on the page (index.html). Consent Mode decides
 *   what Google keeps, so before a choice these events reach Google only as its
 *   anonymous pings, as Xenvia asked.
 * - **The Meta Pixel** exists only after "Aceptar todas" (src/consent.js), so
 *   before that its events are not sent at all.
 *
 * The names and parameters are what the ad platforms match on, not copy.
 */

// The Pixel's original key, unchanged, so a customer it has already counted is
// not counted again.
const FIRST_PURCHASE_TRACKED_KEY = 'fbq_first_purchase_tracked';
const PURCHASE_TRACKED_KEY = 'ga4_purchase_tracked';

/**
 * How recently a payment must have changed for its transfer to count as a
 * purchase now.
 *
 * Every paid transfer counts, and the event fires when its page is opened, so
 * without a window the first visit after release would report a customer's
 * whole history as new purchases. A card payment lands on the page within
 * minutes; three days also covers a customer who comes back to check.
 */
export const PURCHASE_WINDOW_HOURS = 72;

export function isPaymentCompleted(payment) {
    const code = payment?.state?.code;

    return code === PaymentState.AUTHORIZED || code === PaymentState.CAPTURED;
}

/** The account was created (email sign-up). */
export function trackSignUp() {
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'sign_up', {method: 'email'});
    }
    if (typeof window.fbq === 'function') {
        window.fbq('track', 'CompleteRegistration');
    }
}

/** A document was approved while the customer had the app open. */
export function trackKycApproved() {
    if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', 'KYCApproved');
    }
}

/**
 * A transfer's payment is confirmed.
 *
 * - **Google:** every transfer, once.
 * - **Pixel:** only the customer's first, as it has counted since July.
 *
 * @param {import('@/models/transaction.js').default} transaction
 * @param {string|null} customerId
 * @param {number} now epoch milliseconds
 */
export function trackPaymentConfirmed(transaction, customerId, now = Date.now()) {
    if (!isPaymentCompleted(transaction?.payment)) {
        return;
    }

    trackPurchase(transaction, now);
    trackFirstPurchase(transaction, customerId);
}

function trackPurchase(transaction, now) {
    if (typeof window.gtag !== 'function') {
        return;
    }

    const changedAt = Date.parse(transaction.payment.updatedAt);
    if (!Number.isFinite(changedAt) || now - changedAt > PURCHASE_WINDOW_HOURS * 60 * 60 * 1000) {
        return;
    }

    const key = `${PURCHASE_TRACKED_KEY}_${transaction.id}`;
    if (readFlag(key)) {
        return;
    }

    // local_amount arrives as a decimal string ("150.00"). Google needs it as a
    // number; the figure is the one the API sent, never worked out here.
    // parseFloat, not Number: Number(null) is 0, which would report a purchase
    // worth nothing instead of none.
    const value = Number.parseFloat(transaction.localAmount);
    const currency = transaction.paymentCurrency?.isoAlpha;
    if (!Number.isFinite(value) || !currency) {
        return;
    }

    window.gtag('event', 'purchase', {
        transaction_id: String(transaction.transactionNumber),
        value,
        currency,
    });
    writeFlag(key);
}

function trackFirstPurchase(transaction, customerId) {
    if (!customerId || typeof window.fbq !== 'function') {
        return;
    }

    const key = `${FIRST_PURCHASE_TRACKED_KEY}_${customerId}`;
    if (readFlag(key)) {
        return;
    }

    window.fbq('track', 'Purchase', {
        value: transaction.localAmount,
        currency: transaction.paymentCurrency?.isoAlpha,
    });
    writeFlag(key);
}

function readFlag(key) {
    try {
        return localStorage.getItem(key) !== null;
    } catch {
        return false;
    }
}

function writeFlag(key) {
    try {
        localStorage.setItem(key, '1');
    } catch {
        // Storage refused: the event may be sent again on a later visit.
    }
}
