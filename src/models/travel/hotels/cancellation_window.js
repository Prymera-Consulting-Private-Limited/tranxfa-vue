import Money from "@/models/travel/money.js";

/**
 * One window of a rate's cancellation terms, and what cancelling inside it
 * would cost (SD-1839).
 *
 * The console prices each window with the same answer it gives for cancelling
 * now, so a cost here is shown as it came and never worked out from the
 * supplier's figures: the two could only disagree if the client did sums.
 */
class CancellationWindow {
    /**
     * When the window starts. Null when it is in force already.
     *
     * @type {string|null}
     */
    from = null;

    /**
     * When it ends. Null when it runs up to the stay.
     *
     * @type {string|null}
     */
    until = null;

    /**
     * One of CANCELLATION_STATUS, read the same way as the rate's own.
     *
     * @type {string|null}
     */
    status = null;

    /**
     * Unstated when the status is unknown.
     *
     * @type {Money|null}
     */
    costs = null;

    static getInstance(data) {
        const period = new CancellationWindow();

        period.from = data.from ?? null;
        period.until = data.until ?? null;
        period.status = data.status ?? null;
        period.costs = Money.getInstance(data, 'costs');

        return period;
    }

    /**
     * @param {Array} data
     * @returns {CancellationWindow[]}
     */
    static getCollection(data) {
        return data.map(item => CancellationWindow.getInstance(item));
    }
}

export default CancellationWindow;
