import Money from "@/models/travel/money.js";

/**
 * What cancelling would cost right now. Null whenever cancelling is not possible,
 * and also when the cost cannot be worked out — so an absent quote is never a
 * free one.
 *
 * It moves with the clock: a booking free until midnight is not free at 00:01.
 * Re-read it when the screen opens rather than caching it.
 */
class OrderCancellationQuote {
    /**
     * @type {boolean}
     */
    isFree = false;

    /**
     * @type {boolean}
     */
    isInsideFreeWindow = false;

    /**
     * @type {Money|null}
     */
    costsNow = null;

    /**
     * @type {Money|null}
     */
    refundNow = null;

    static getInstance(data) {
        const quote = new OrderCancellationQuote();

        quote.isFree = data.is_free ?? false;
        quote.isInsideFreeWindow = data.is_inside_free_window ?? false;
        quote.costsNow = Money.getInstance(data, 'costs_now');
        quote.refundNow = Money.getInstance(data, 'refund_now');

        return quote;
    }
}

export default OrderCancellationQuote;
