import Money from "@/models/travel/money.js";
import ClientPaymentAccount from "@/models/client_payment_account.js";

/**
 * One attempt at paying for a booking. Failed attempts are listed too, on
 * purpose: somebody declined once who paid on the second try should see both
 * rather than wonder whether they were charged twice.
 *
 * Why an attempt failed is not something the app shows. The order's list of
 * attempts deliberately never carries it; the create answer still sends
 * failure_reason, but that is the provider's own wording, written for
 * integrators, and reads to a customer as gibberish or as an accusation. The
 * state is what carries meaning. SD-1002 will replace the text with a code.
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
     * The customer's own account to pay into, on a PayID or bank transfer rail —
     * the same object a transfer's payment carries, so it is read and rendered
     * the same way. Null on every other rail, and null while the account is
     * still being opened, which is what CREATED means on this rail.
     *
     * The order view carries it on every listed attempt as well as the create
     * answer, because a customer who left cannot get it by paying again: a
     * second attempt is refused while this one is open.
     *
     * @type {ClientPaymentAccount|null}
     */
    clientPaymentAccount = null;

    /**
     * When this payment stops being payable, the deadline the platform enforces.
     * Five days on a deposit rail, not the price hold. Null means it never
     * expires.
     *
     * @type {string|null}
     */
    expiresAt = null;

    /**
     * The provider's own wording for a FAILED payment, on the create answer
     * only. Never shown to the customer and never branched on — see the class
     * comment. Kept so the mapper does not quietly drop a field the api sends.
     *
     * @type {string|null}
     */
    failureReason = null;

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
     * The customer pays by sending money to an account, and that account is
     * ready. Decided by the answer rather than by the method, because the same
     * method can route to a rail that redirects instead.
     *
     * @returns {boolean}
     */
    get hasAccountDetails() {
        return this.isReadyToPay && this.clientPaymentAccount !== null;
    }

    /**
     * The payment exists but there is nothing to act on yet — on a deposit rail,
     * the customer's account is being opened, which takes a few seconds for
     * somebody who has never paid this way. Reading the order again is how it
     * moves on.
     *
     * @returns {boolean}
     */
    get isSettingUp() {
        return this.state === 'CREATED' && this.clientPaymentAccount === null;
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
        payment.clientPaymentAccount = data.client_payment_account
            ? ClientPaymentAccount.getInstance(data.client_payment_account)
            : null;
        payment.expiresAt = data.expires_at ?? null;
        payment.failureReason = data.failure_reason ?? null;

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
