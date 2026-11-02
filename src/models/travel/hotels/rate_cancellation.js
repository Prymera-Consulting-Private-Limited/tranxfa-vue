import Money from "@/models/travel/money.js";
import CancellationWindow from "@/models/travel/hotels/cancellation_window.js";

/**
 * Cancellation as the backend has already resolved it. The supplier states it as
 * a ladder of windows, but that is evaluated server-side, so what arrives here is
 * the answer for right now and never something to compare against the clock.
 * The ladder itself comes too, each window already priced, so the customer can
 * see what cancelling costs later as well as now.
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

    /**
     * What cancelling would give back. Only the quote states it — search and the
     * hotel page price a rate rather than a booking, so there is nothing to
     * refund yet.
     *
     * @type {Money|null}
     */
    refundNow = null;

    /**
     * Every window still to come, in the supplier's order. A window that has
     * ended is left out by the console.
     *
     * @type {CancellationWindow[]}
     */
    ladder = [];

    static getInstance(data) {
        const cancellation = new RateCancellation();

        cancellation.status = data.status ?? null;
        cancellation.costsNow = Money.getInstance(data, 'costs_now');
        cancellation.freeUntil = data.free_until ?? null;
        cancellation.changesAt = data.changes_at ?? null;
        cancellation.refundNow = Money.getInstance(data, 'refund_now');
        // A console before 2026.10.11 sends none.
        cancellation.ladder = CancellationWindow.getCollection(data.ladder ?? []);

        return cancellation;
    }
}

export default RateCancellation;
