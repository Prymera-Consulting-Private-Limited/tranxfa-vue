/**
 * What the hotel confirmed, written once and never recomputed, so it reads the
 * same in a year as it did on the day. Null until the hotel answers.
 *
 * Being a record rather than a view, its total is a rendered string instead of
 * the three-key money shape — there is nothing here to compute with. priceLines
 * and cancellationLadder are the raw stored structures and are kept opaque;
 * the order's own breakdown is what gets displayed.
 */
class OrderConfirmation {
    /**
     * The hotel name as recorded, not a reference to one.
     *
     * @type {string|null}
     */
    hotel = null;

    /**
     * @type {string|null}
     */
    roomName = null;

    /**
     * @type {string|null}
     */
    meal = null;

    /**
     * @type {string|null}
     */
    checkIn = null;

    /**
     * @type {string|null}
     */
    checkOut = null;

    /**
     * @type {number|null}
     */
    nights = null;

    /**
     * @type {object|null}
     */
    occupancy = null;

    /**
     * Already rendered, currency and all.
     *
     * @type {string|null}
     */
    total = null;

    /**
     * @type {object|null}
     */
    priceLines = null;

    /**
     * @type {object|null}
     */
    cancellationLadder = null;

    /**
     * @type {string|null}
     */
    confirmedAt = null;

    static getInstance(data) {
        const confirmation = new OrderConfirmation();

        confirmation.hotel = data.hotel ?? null;
        confirmation.roomName = data.room_name ?? null;
        confirmation.meal = data.meal ?? null;
        confirmation.checkIn = data.check_in ?? null;
        confirmation.checkOut = data.check_out ?? null;
        confirmation.nights = data.nights ?? null;
        confirmation.occupancy = data.occupancy ?? null;
        confirmation.total = data.total ?? null;
        confirmation.priceLines = data.price_lines ?? null;
        confirmation.cancellationLadder = data.cancellation_ladder ?? null;
        confirmation.confirmedAt = data.confirmed_at ?? null;

        return confirmation;
    }
}

export default OrderConfirmation;
