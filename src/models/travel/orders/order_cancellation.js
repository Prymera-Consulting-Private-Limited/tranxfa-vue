import OrderCancellationQuote from "@/models/travel/orders/order_cancellation_quote.js";
import OrderCancellationRequest from "@/models/travel/orders/order_cancellation_request.js";

/**
 * Everything about cancelling one booking: whether anyone has asked, whether it
 * can be asked now, and what asking would cost.
 *
 * On the bookings list this whole block is null until somebody asks. On one
 * booking it is always present, with a null request until then.
 */
class OrderCancellation {
    /**
     * @type {OrderCancellationRequest|null}
     */
    request = null;

    /**
     * Answered on exactly the rules the cancel call enforces, so a button bound
     * to this cannot disagree with what happens when it is pressed.
     *
     * @type {boolean}
     */
    canCancelNow = false;

    /**
     * @type {OrderCancellationQuote|null}
     */
    quote = null;

    /**
     * The booking is only gone when a request says so. A refused or unresolved
     * request leaves it completely live, and rendering either as cancelled sends
     * somebody to a hotel that still holds their room.
     *
     * @returns {boolean}
     */
    get isCancelled() {
        return this.request?.isCancelled ?? false;
    }

    /**
     * @returns {boolean}
     */
    get isPending() {
        return this.request !== null && !this.request.isCancelled;
    }

    static getInstance(data) {
        const cancellation = new OrderCancellation();

        if (data.requested) {
            cancellation.request = OrderCancellationRequest.getInstance(data.requested);
        }

        cancellation.canCancelNow = data.can_cancel_now ?? false;

        if (data.quote) {
            cancellation.quote = OrderCancellationQuote.getInstance(data.quote);
        }

        return cancellation;
    }
}

export default OrderCancellation;
