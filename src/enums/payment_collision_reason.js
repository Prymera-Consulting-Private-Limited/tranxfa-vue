/**
 * Why a rail that pays into the customer's own deposit account refused to take
 * a payment yet. Sent as `reason` beside the unchanged 412 `type` on both
 * payment_amount_collides (transfer checkout) and wallet_topup_amount_collides
 * (wallet load), from console release 2026.09.2 (SD-1248).
 *
 * Only one of the two can be got round by changing the amount, which is the
 * whole reason for telling them apart. A backend older than that release sends
 * no reason at all, and that is the case to expect for a long while.
 */
const PaymentCollisionReason = Object.freeze({
    // Held for another payment whatever its amount, for up to an hour. A
    // different amount is refused the same way.
    ACCOUNT_HELD: 'account_held',
    // Another open payment already expects exactly this figure.
    SAME_AMOUNT: 'same_amount',
});

export default PaymentCollisionReason;
