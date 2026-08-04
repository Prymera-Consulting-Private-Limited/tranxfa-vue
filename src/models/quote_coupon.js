class QuoteCoupon {
    /**
     * @type {string|null}
     */
    code = null;

    /**
     * @type {string|null}
     */
    discountType = null;

    /**
     * @type {string|null}
     */
    infoText = null;

    /**
     * @type {string|null}
     */
    termsText = null;

    /**
     * Null for a better-rate coupon.
     *
     * @type {string|null}
     */
    discountAmount = null;

    /**
     * Null for a better-rate coupon.
     *
     * @type {string|null}
     */
    discountAmountCurrencyPrefixed = null;

    /**
     * The rate before the coupon was applied, for a better-rate coupon only.
     * Null for a monetary coupon.
     *
     * @type {string|null}
     */
    exchangeRateBeforeCoupon = null;

    /**
     * The pre-coupon rate as a display label, built by the same formatter as the
     * quote's `exchange_rate_formatted` (including payout-first ordering on an
     * inverse pair), so the two can be shown as "was / now" without the client
     * reproducing any ordering or formatting rules.
     *
     * @type {string|null}
     */
    exchangeRateBeforeCouponFormatted = null;

    static getInstance(data) {
        const coupon = new QuoteCoupon();
        coupon.code = data.code;
        coupon.discountType = data.discount_type;
        coupon.infoText = data.info_text;
        coupon.termsText = data.terms_text;
        coupon.discountAmount = data.discount_amount;
        coupon.discountAmountCurrencyPrefixed = data.discount_amount_currency_prefixed;
        coupon.exchangeRateBeforeCoupon = data.exchange_rate_before_coupon;
        coupon.exchangeRateBeforeCouponFormatted = data.exchange_rate_before_coupon_formatted;
        return coupon;
    }
}

export default QuoteCoupon;
