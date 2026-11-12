import PaymentProvider from "@/models/payment_provider.js";

class PaymentMethod {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    code = null;

    /**
     * @type {String|null}
     */
    title = null;

    /**
     * @type {String|null}
     */
    description = null;

    /**
     * What paying this way adds on top of the base fee, as a decimal string in
     * the payment currency, "0.00" where it adds nothing. Only a saved quote
     * carries it (console 2026.10.6, SD-1746); null on the unsaved price and
     * from an older console.
     *
     * @type {String|null}
     */
    fee = null;

    /**
     * @type {String|null}
     */
    feeCurrencyPrefixed = null;

    /**
     * What the customer pays in total this way: the amount sent, the base fee
     * and this method's fee, less any coupon as it applies with that fee. The
     * figure for the amount due once this method is chosen. The quote's own
     * total is the figure before any method's fee, so it is never the amount
     * due for a method that has one.
     *
     * @type {String|null}
     */
    totalAmount = null;

    /**
     * @type {String|null}
     */
    totalAmountCurrencyPrefixed = null;

    /**
     * The smallest amount sent the fee rule accepts this way, as a decimal
     * string; null where it sets none (SD-1774). Confirm Quote refuses less with
     * a 412 payment_method_minimum.
     *
     * @type {String|null}
     */
    minAmount = null;

    /**
     * @type {String|null}
     */
    minAmountCurrencyPrefixed = null;

    /**
     * The step the amount sent has to be a multiple of this way, as a decimal
     * string; null where the fee rule sets none (SD-1774). Confirm Quote refuses
     * anything else with a 412 payment_method_multiple.
     *
     * @type {String|null}
     */
    amountMultiplier = null;

    /**
     * @type {String|null}
     */
    amountMultiplierCurrencyPrefixed = null;

    /**
     * @type {PaymentProvider[]}
     */
    providers = [];

    /**
     * Whether paying this way costs more than the base fee. "0.00" and an
     * absent fee both mean it does not, and then no line is shown for it.
     *
     * @returns {boolean}
     */
    get hasFee() {
        return this.fee !== null && Number(this.fee) !== 0;
    }

    static getInstance(data) {
        const paymentMethod = new PaymentMethod();
        paymentMethod.id = data.id;
        paymentMethod.code = data.code;
        paymentMethod.title = data.title;
        paymentMethod.description = data.description;
        paymentMethod.fee = data.fee ?? null;
        paymentMethod.feeCurrencyPrefixed = data.fee_currency_prefixed ?? null;
        paymentMethod.totalAmount = data.total_amount ?? null;
        paymentMethod.totalAmountCurrencyPrefixed = data.total_amount_currency_prefixed ?? null;
        paymentMethod.minAmount = data.min_amount ?? null;
        paymentMethod.minAmountCurrencyPrefixed = data.min_amount_currency_prefixed ?? null;
        paymentMethod.amountMultiplier = data.amount_multiplier ?? null;
        paymentMethod.amountMultiplierCurrencyPrefixed = data.amount_multiplier_currency_prefixed ?? null;
        if (data.providers?.length > 0) {
            paymentMethod.providers = data.providers.map((provider) => {
                return PaymentProvider.getInstance(provider);
            });
        }
        return paymentMethod;
    }
}

export default PaymentMethod;