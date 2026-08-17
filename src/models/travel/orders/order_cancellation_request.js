import Money from "@/models/travel/money.js";

/**
 * A cancellation somebody asked for. Its existence says nothing about whether the
 * booking is gone — a hotel can refuse, and a refused request leaves the room
 * still held. isCancelled is the only thing that answers that.
 */
class OrderCancellationRequest {
    /**
     * REQUESTED, ACCEPTED, REFUSED or UNRESOLVED.
     *
     * @type {string|null}
     */
    state = null;

    /**
     * @type {string|null}
     */
    stateLabel = null;

    /**
     * The one fact worth branching on. UNRESOLVED means we asked and never got an
     * answer we could act on, which is "we are looking into it" and never
     * cancelled.
     *
     * @type {boolean}
     */
    isCancelled = false;

    /**
     * @type {string|null}
     */
    requestedAt = null;

    /**
     * Whether the money has actually left, which is not the same as being owed
     * it — some providers cannot be refunded automatically and a person sends it.
     *
     * @type {boolean}
     */
    refundSent = false;

    /**
     * @type {Money|null}
     */
    charged = null;

    /**
     * @type {Money|null}
     */
    refundOwed = null;

    static getInstance(data) {
        const request = new OrderCancellationRequest();

        request.state = data.state ?? null;
        request.stateLabel = data.state_label ?? null;
        request.isCancelled = data.is_cancelled ?? false;
        request.requestedAt = data.requested_at ?? null;
        request.refundSent = data.refund_sent ?? false;
        request.charged = Money.getInstance(data, 'charged');
        request.refundOwed = Money.getInstance(data, 'refund_owed');

        return request;
    }
}

export default OrderCancellationRequest;
