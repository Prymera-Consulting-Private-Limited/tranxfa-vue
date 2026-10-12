// Why Cancel Transfer Payment answered 409 (SD-1418). Either way nothing
// changed, so the transfer is re-read and the api's message shown.
const PaymentCancelRefusalType = Object.freeze({
    // Paid, failed, already cancelled, or the money is held at the provider.
    PAYMENT_NOT_OPEN: 'payment_not_open',
    // The gateway cannot withdraw a payment it has started (SD-1422).
    PAYMENT_NOT_CANCELLABLE: 'payment_not_cancellable',
});

export default PaymentCancelRefusalType;
