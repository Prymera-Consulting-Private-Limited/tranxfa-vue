/**
 * The promotion coupon applied to a quote, as the Client API reference's
 * `coupon` block describes it. When set, the quote's total_* fields are
 * already net of a monetary discount and exchange_rate is already the
 * improved rate; the two *_before_coupon fields carry the "was" side.
 */
class QuoteCoupon {
    /** @type {string|null} the applied code, as configured */
    code = null;

    /** @type {'monetary'|'better-rate'|null} */
    discountType = null;

    /** @type {string|null} customer-facing summary, when configured */
    infoText = null;

    /** @type {string|null} customer-facing terms, when configured */
    termsText = null;

    /** @type {string|null} major units of payment_currency; monetary coupons only */
    discountAmount = null;

    /** @type {string|null} ready to render as the savings line */
    discountAmountCurrencyPrefixed = null;

    /** @type {string|null} better-rate coupons only */
    exchangeRateBeforeCoupon = null;

    /** @type {string|null} built like exchange_rate_formatted; pair as was/now */
    exchangeRateBeforeCouponFormatted = null;

    get isMonetary() {
        return this.discountType === 'monetary';
    }

    get isBetterRate() {
        return this.discountType === 'better-rate';
    }

    /**
     * @param {object|null} data
     * @returns {QuoteCoupon|null}
     */
    static getInstance(data) {
        if (! data) {
            return null;
        }
        const coupon = new QuoteCoupon();
        coupon.code = data.code ?? null;
        coupon.discountType = data.discount_type ?? null;
        coupon.infoText = data.info_text ?? null;
        coupon.termsText = data.terms_text ?? null;
        coupon.discountAmount = data.discount_amount ?? null;
        coupon.discountAmountCurrencyPrefixed = data.discount_amount_currency_prefixed ?? null;
        coupon.exchangeRateBeforeCoupon = data.exchange_rate_before_coupon ?? null;
        coupon.exchangeRateBeforeCouponFormatted = data.exchange_rate_before_coupon_formatted ?? null;

        return coupon;
    }
}

export default QuoteCoupon;
