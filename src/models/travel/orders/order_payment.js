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
     * Only on the payment the create call answers with. The order's list of
     * attempts does not carry it, and the sdk hand-off and the broadcast channel
     * both key on it.
     *
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    reference = null;

    /**
     * The reference shared with the provider — what reconciles this payment with
     * them later, and what the sdk is handed. Distinct from `reference`, which is
     * ours, and from the client payment account's payment_reference, which is
     * what a customer quotes on a manual bank transfer.
     *
     * @type {string|null}
     */
    sharedReference = null;

    /**
     * Null for Volume, permanently and correctly — it is sdk driven and issues no
     * redirect. A url here means a provider that hands the customer over instead.
     *
     * @type {string|null}
     */
    paymentUrl = null;

    /**
     * @type {{code: string|null, title: string|null}|null}
     */
    provider = null;


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

    /**
     * Money has gone back. Partly is the ordinary outcome rather than the odd one
     * — cancelling a room usually forfeits something — so this is not an edge
     * case and must not read as one.
     *
     * @returns {boolean}
     */
    get isRefunded() {
        return this.state === 'REFUNDED' || this.state === 'PART-REFUNDED';
    }

    /**
     * @returns {boolean}
     */
    get isPartlyRefunded() {
        return this.state === 'PART-REFUNDED';
    }

    /**
     * Ready for the customer to act on. CREATED and INITIALIZED mean the provider
     * has not answered yet and there is nothing to show them; PENDING is the
     * state that says go. The transfer flow gates every provider on exactly this
     * and travel now reaches it the same way.
     *
     * @returns {boolean}
     */
    get isReadyToPay() {
        return this.state === 'PENDING';
    }

    /**
     * @returns {boolean}
     */
    get isVolume() {
        return this.provider?.code === 'VOLUME-PAYMENTS';
    }

    /**
     * What the Volume sdk is handed. The api sends this figure outright rather
     * than leaving it to be derived, so nothing here divides and nothing needs to
     * know how many places the currency takes.
     *
     * Null when it is absent, which stops the payment rather than guessing at it.
     * See Money.major for why every other way of reaching this number is wrong.
     *
     * @returns {number|null}
     */
    get majorAmount() {
        return this.amount?.major ?? null;
    }

    static getInstance(data) {
        const payment = new OrderPayment();

        payment.id = data.id ?? null;
        payment.reference = data.reference ?? null;
        payment.sharedReference = data.shared_reference ?? null;
        payment.paymentUrl = data.payment_url ?? null;
        payment.state = data.state ?? null;
        payment.stateLabel = data.state_label ?? null;
        payment.attemptedAt = data.attempted_at ?? null;
        payment.amount = Money.getInstance(data, 'amount');

        // A listed attempt names its method as a string; the payment the create
        // call answers with sends the method and the provider as objects.
        payment.method = data.method ?? data.payment_method?.title ?? null;
        payment.provider = data.provider
            ? {code: data.provider.code ?? null, title: data.provider.title ?? null}
            : null;

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
