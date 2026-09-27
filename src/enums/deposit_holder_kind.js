// What is holding a customer's deposit account when a payment is refused with
// account_held or same_amount (SD-1261). It says which screen the customer has
// to open to pay or cancel the payment in their way. The strings are the
// console's (App\Enum\DepositHolderKind); a kind this app does not know gets
// no button, and the message still says what to do.
const DepositHolderKind = Object.freeze({
    // A hotel or flight order. `service` on the holder says which.
    SERVICE_ORDER: 'service_order',
    TRANSFER: 'transfer',
    WALLET_TOPUP: 'wallet_topup',
});

export default DepositHolderKind;
