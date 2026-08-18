import Money from "@/models/travel/money.js";

/**
 * One attempt at paying for a booking. Failed attempts are listed too, on
 * purpose: somebody declined once who paid on the second try should see both
 * rather than wonder whether they were charged twice.
 *
 * Why an attempt failed is deliberately not sent — gateway wording is written for
 * integrators and reads to a customer as gibberish or as an accusation. The state
 * is what carries meaning.
 */
class OrderPayment {
    /**
     * @type {string|null}
     */
    reference = null;

    /**
     * @type {string|null}
     */
    state = null;

    /**
     * @type {string|null}
     */
    stateLabel = null;

    /**
     * @type {string|null}
     */
    method = null;

    /**
     * @type {string|null}
     */
    attemptedAt = null;

    /**
     * @type {Money|null}
     */
    amount = null;

    /**
     * Nothing more will happen to this attempt on its own. A refund is a later
     * event against a payment that already succeeded, so those count as settled
     * too — the wait is over either way.
     *
     * @returns {boolean}
     */
    get isSettled() {
        return [
            'AUTHORIZED',
            'CAPTURED',
            'FAILED',
            'TIMED-OUT',
            'CANCELLED',
            'PART-REFUNDED',
            'REFUNDED',
        ].includes(this.state);
    }

    /**
     * @returns {boolean}
     */
    get isSuccessful() {
        return ['AUTHORIZED', 'CAPTURED', 'PART-REFUNDED', 'REFUNDED'].includes(this.state);
    }

    /**
     * @returns {boolean}
     */
    get hasFailed() {
        return ['FAILED', 'TIMED-OUT', 'CANCELLED'].includes(this.state);
    }

    static getInstance(data) {
        const payment = new OrderPayment();

        payment.reference = data.reference ?? null;
        payment.state = data.state ?? null;
        payment.stateLabel = data.state_label ?? null;
        payment.method = data.method ?? null;
        payment.attemptedAt = data.attempted_at ?? null;
        payment.amount = Money.getInstance(data, 'amount');

        return payment;
    }

    /**
     * @param {Array} data
     * @returns {OrderPayment[]}
     */
    static getCollection(data) {
        return data.map(item => OrderPayment.getInstance(item));
    }
}

export default OrderPayment;
