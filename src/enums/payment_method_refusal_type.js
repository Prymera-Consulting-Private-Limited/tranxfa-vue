/**
 * Why Confirm Quote refused the payment method the customer chose, as the 412
 * `type` from console release 2026.10.6 (SD-1774, SD-1747). The first two are
 * the fee rule's terms for that method, which a saved quote already lists
 * beside it, so the app greys the method out before checkout can refuse it.
 * The third is a way to pay this app is no longer offered; a retried payment
 * can be refused the same way.
 */
const PaymentMethodRefusalType = Object.freeze({
    BELOW_MINIMUM: 'payment_method_minimum',
    NOT_A_MULTIPLE: 'payment_method_multiple',
    UNAVAILABLE: 'payment_method_unavailable',
});

export default PaymentMethodRefusalType;
