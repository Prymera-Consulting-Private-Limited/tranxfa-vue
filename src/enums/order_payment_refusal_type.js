// Why Pay Order answered 409 (SD-1248). The status alone covers all of these,
// and the message is written for a person, so this is what the app branches on.
// A 409 without a type comes from a console older than SD-1248 and is handled
// as it always was: the message is shown and the customer can choose again.
const OrderPaymentRefusalType = Object.freeze({
    // The order has ended, cancelled or failed. There is nothing left to pay.
    ORDER_NOT_PAYABLE: 'order_not_payable',
    ORDER_ALREADY_PAID: 'order_already_paid',
    // A payment on this order is still open. Its details are on the order.
    PAYMENT_WAITING: 'payment_waiting',
    // The deposit account is held for another payment, whatever its amount. It
    // clears when that payment is paid or cancelled. The provider lets go on
    // its own in the end, but when is the deployment's setting (30 hours on
    // Payvel), so no screen ever promises a time (SD-1261).
    ACCOUNT_HELD: 'account_held',
    // Another open payment already expects this exact amount. A hotel price
    // cannot change, so only paying or cancelling the other one clears it.
    SAME_AMOUNT: 'same_amount',
    METHOD_NOT_OFFERED: 'method_not_offered',
    METHOD_UNAVAILABLE: 'method_unavailable',
    METHOD_SETTLED_BY_HAND: 'method_settled_by_hand',
    // Only ever from Cancel Order Payment: the payment has been paid, has
    // failed, was already cancelled, or its money is held at the provider.
    PAYMENT_NOT_OPEN: 'payment_not_open',
});

export default OrderPaymentRefusalType;
