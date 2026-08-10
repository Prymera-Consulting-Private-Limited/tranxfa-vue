import Money from "@/models/travel/hotels/money.js";

/**
 * Cancellation as the backend has already resolved it. The supplier states it as
 * a ladder of windows, but that is evaluated server-side, so what arrives here is
 * the answer for right now and never something to compare against the clock.
 */
class RateCancellation {
    /**
     * One of CANCELLATION_STATUS. "unknown" is not a gap in our mapping — some
     * supplier rates carry no cancellation terms at all, and the backend says so
     * rather than inventing either a free window or a penalty.
     *
     * @type {string|null}
     */
    status = null;

    /**
     * What cancelling today would cost. Unstated when the status is unknown,
     * since there is nothing to say.
     *
     * @type {Money|null}
     */
    costsNow = null;

    /**
     * Null unless the status is free.
     *
     * @type {string|null}
     */
    freeUntil = null;

    /**
     * When costsNow next changes, which the supplier does not always know.
     *
     * @type {string|null}
     */
    changesAt = null;

    static getInstance(data) {
        const cancellation = new RateCancellation();

        cancellation.status = data.status ?? null;
        cancellation.costsNow = Money.getInstance(data, 'costs_now');
        cancellation.freeUntil = data.free_until ?? null;
        cancellation.changesAt = data.changes_at ?? null;

        return cancellation;
    }
}

export default RateCancellation;
