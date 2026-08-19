import axios from "axios";

/**
 * What a page is capped at. A larger number is quietly reduced rather than
 * refused, so asking for more than this only hides the real page size.
 */
export const ORDERS_LIMIT_MAX = 50;

/**
 * The endpoint's own default, stated here so the ui and any url parsing agree
 * on what a page holds without waiting for a response to find out.
 */
export const ORDERS_PER_PAGE = 10;

/**
 * The closed set of order states, in the order a booking moves through them.
 * CONFIRMED means the order was placed — whether the hotel has confirmed the room
 * is is_confirmed, which is a different question.
 */
export const ORDER_STATES = [
    {value: 'CREATED', label: 'Created'},
    {value: 'CONFIRMED', label: 'Confirmed'},
    {value: 'FULFILLED', label: 'Fulfilled'},
    {value: 'CANCELLED', label: 'Cancelled'},
    {value: 'FAILED', label: 'Failed'},
];

/**
 * How long to wait before asking again whether the hotel has confirmed.
 *
 * There is a broadcast for this now, but it only reaches whoever is still
 * watching — a customer who closed the tab or lost signal missed it. So asking
 * remains the source of truth and the socket only shortens the wait, paced
 * against a confirmation that takes seconds to minutes.
 */
export const CONFIRMATION_POLL_MS = 15000;

/**
 * How long to wait before asking again whether a payment has settled. Shorter
 * than the confirmation poll because somebody is watching this one — they have
 * just come back from their bank and want to know it worked.
 *
 * The transfer flow watches a payment over a broadcast instead, on
 * client-payment.{payment id} — which travel cannot copy even as a guess, since
 * the payment this api answers with carries no id to key a channel on. A guessed
 * channel fails silently anyway: the subscription is refused and the screen
 * waits for ever. Asking is the honest mechanism until both are given to us.
 */
export const PAYMENT_POLL_MS = 5000;

export function useOrderUtils() {
    /**
     * A customer's hotel bookings, newest first, in the same {data, pagination}
     * envelope the transactions list already reads.
     *
     * A booking is confirmed by the hotel answering our status check, which
     * happens after the booking call has returned — so confirmed_at is always
     * null on a fresh booking and is_confirmed is how confirmation is learnt.
     * Anything showing a booking's progress has to ask again rather than trust
     * what it stored.
     *
     * @param {{page: number|null, limit: number|null, state: string|null, upcoming: boolean}} options
     */
    async function orders({page = null, limit = null, state = null, upcoming = false} = {}) {
        return await axios.get('/client/v1/travel/orders', {
            params: {
                page: page ?? undefined,
                limit: limit ?? undefined,
                state: state ?? undefined,
                upcoming: upcoming ? 1 : undefined,
            },
        });
    }

    /**
     * One booking in full: what it was charged for, every payment attempt
     * including the failed ones, the record written when the hotel confirmed,
     * and what cancelling would cost right now.
     *
     * The cancellation quote moves with the clock — a booking free until
     * midnight is not free at 00:01 — so this is re-read when the screen opens
     * rather than cached.
     *
     * @param {string} orderId
     */
    async function getOrder(orderId) {
        return await axios.get(`/client/v1/travel/order/${orderId}`);
    }

    /**
     * Turns a held quote into a real booking. Names, an email and a phone number
     * are all it wants — no document, no date of birth, and neither should be
     * collected for this.
     *
     * Guests stay grouped in the rooms they were priced into, in the order the
     * search was asked for them — the booking answers the same occupancy
     * question, and the room count is checked against the quote.
     *
     * @param {string} quoteId
     * @param {{email: string, phone: string|null, rooms: Array<{guests: Array<{first_name: string, last_name: string, is_child: boolean}>}>}} payload
     */
    async function bookQuote(quoteId, payload) {
        return await axios.post(`/client/v1/travel/booking/${quoteId}`, payload);
    }

    /**
     * Already filtered to what this customer may use — their country, their
     * currency, and what the operator has said hotels accept — and in the same
     * shape a transfer quote carries, so the existing picker reads it unchanged.
     */
    async function paymentMethods() {
        return await axios.get('/client/v1/travel/payment-methods');
    }

    /**
     * Opens the payment with the provider in the same request, answering with a
     * payment_url wherever the provider uses one.
     *
     * Volume, the only rail this deployment offers, uses none — it is sdk driven,
     * so the url is null permanently and the hand-off is a call into
     * window.Volume rather than a redirect. What that call needs is not on this
     * response yet, so it is not wired; PaymentView's pay() records what is
     * missing and why guessing at it would be worse than waiting.
     *
     * @param {string} orderId
     * @param {object} payload
     */
    async function createPayment(orderId, payload) {
        return await axios.post(`/client/v1/travel/order/${orderId}/payment`, payload);
    }

    /**
     * Asks the supplier to cancel. They can refuse, and an answer nobody can act
     * on leaves it unresolved for a while without anything being wrong, so this
     * settles nothing on its own — the order is re-read for the outcome.
     *
     * @param {string} orderId
     */
    async function cancelOrder(orderId) {
        return await axios.post(`/client/v1/travel/order/${orderId}/cancellation`);
    }

    // GET /travel/order/{order}/cancellation is not wired, and no longer needs to
    // be. It used to quote a price without checking whether the booking could
    // still be cancelled, so it would price a stay that had already started and
    // the POST would then refuse with a 409; that is fixed, and both it and the
    // order are now computed from the same rule. The order already carries
    // can_cancel_now and the quote, so there is nothing left for a second call
    // to answer.

    return {
        orders,
        getOrder,
        bookQuote,
        paymentMethods,
        createPayment,
        cancelOrder,
    }
}
