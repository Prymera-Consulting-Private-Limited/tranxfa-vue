/**
 * The supplier's confirmation that a rate is still available, returned by the
 * prebook call a "Book now" click makes. The price and cancellation terms here
 * are what was actually held — price_changed says whether that differs from
 * what the customer saw before clicking, so it can be called out rather than
 * silently swapped in.
 */
class HotelPrebook {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {{amount: string|null, currency: string|null}}
     */
    price = {amount: null, currency: null};

    /**
     * @type {boolean}
     */
    priceChanged = false;

    /**
     * @type {{freeCancellation: boolean, freeCancellationBefore: string|null}}
     */
    cancellation = {freeCancellation: false, freeCancellationBefore: null};

    /**
     * The hold lapses at this point, so the booking step has to be completed
     * before then or a fresh prebook has to be taken out.
     *
     * @type {string|null}
     */
    expiresAt = null;

    static getInstance(data) {
        const prebook = new HotelPrebook();

        prebook.id = data.id;
        prebook.price = {
            amount: data.price?.amount ?? null,
            currency: data.price?.currency ?? null,
        };
        prebook.priceChanged = data.price_changed ?? false;
        prebook.cancellation = {
            freeCancellation: data.cancellation?.free_cancellation ?? false,
            freeCancellationBefore: data.cancellation?.free_cancellation_before ?? null,
        };
        prebook.expiresAt = data.expires_at;

        return prebook;
    }
}

export default HotelPrebook;
