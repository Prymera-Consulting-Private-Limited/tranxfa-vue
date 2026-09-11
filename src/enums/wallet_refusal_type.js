const WalletRefusalType = Object.freeze({
    NOT_OFFERED: 'wallet_not_offered',
    TERMS_UNAVAILABLE: 'wallet_terms_unavailable',
    TERMS_OUTDATED: 'wallet_terms_outdated',
    ALREADY_SUBSCRIBED: 'wallet_already_subscribed',
    BALANCE_MUST_BE_ZERO: 'wallet_balance_must_be_zero',
    TOPUP_AMOUNT_COLLIDES: 'wallet_topup_amount_collides',
    TOPUP_NOT_OPEN: 'wallet_topup_not_open',
    SUBSCRIPTION_REQUIRED: 'wallet_subscription_required',
    TERMS_REACCEPTANCE_REQUIRED: 'wallet_terms_reacceptance_required',
    INSUFFICIENT_BALANCE: 'insufficient_wallet_balance',
    AUTHORIZATION_REQUIRED: 'wallet_authorization_required',
    AUTHORIZATION_INVALID: 'wallet_authorization_invalid',
});

export default WalletRefusalType;
