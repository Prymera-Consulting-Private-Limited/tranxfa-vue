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
 * Confirmation broadcasts for this are absent rather than unplanned: they were
 * lost when hotels moved onto the order spine and are being restored on an
 * order-keyed channel. Until then asking is the only way to find out, paced
 * against a confirmation that takes seconds to minutes.
 */
export const CONFIRMATION_POLL_MS = 15000;

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

    // GET /travel/order/{order}/cancellation is deliberately not wired: it still
    // quotes a price for bookings that cannot be cancelled at all, which the
    // cancel call then refuses with a 409. can_cancel_now and quote on the order
    // itself already answer correctly.

    return {
        orders,
        getOrder,
    }
}
