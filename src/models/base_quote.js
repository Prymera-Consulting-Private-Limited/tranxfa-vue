import Currency from "@/models/currency.js";
import Country from "@/models/country.js";
import PayoutMethod from "@/models/payout_method.js";
import Company from "@/models/company.js";

class BaseQuote {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {Currency|null}
     */
    paymentCurrency = null;

    /**
     * @type {Country|null}
     */
    paymentCountry = null;

    /**
     * @type {Currency|null}
     */
    payoutCurrency = null;

    /**
     * @type {Country|null}
     */
    payoutCountry = null;

    /**
     * @type {PayoutMethod|null}
     */
    payoutMethod = null;

    /**
     * @type {Company|null}
     */
    payoutCompany = null;

    /**
     * @type {String|null}
     */
    amount = null;

    /**
     * @type {string|null}
     */
    amountType = null;

    /**
     * @type {number}
     */
    baseFees = 0;

    /**
     * @type {String|null}
     */
    baseFeesCurrencyPrefixed = null;

    /**
     * @type {String|null}
     */
    baseFeesFormatted = null;

    /**
     * @type {number|null}
     */
    localAmount = null;

    /**
     * @type {String|null}
     */
    localAmountCurrencyPrefixed = null;

    /**
     * @type {String|null}
     */
    localAmountFormatted = null;

    /**
     * @type {number|null}
     */
    foreignAmount = null;

    /**
     * @type {String|null}
     */
    foreignAmountCurrencyPrefixed = null;

    /**
     * @type {String|null}
     */
    foreignAmountFormatted = null;

    /**
     * @type {string|null}
     */
    exchangeRate = null;

    /**
     * @type {string|null}
     */
    exchangeRateFormatted = null;

    static getInstance(quote, data) {
        quote.id = data?.id;
        quote.exchangeRate = data.exchange_rate;
        quote.exchangeRateFormatted = data.exchange_rate_formatted;
        quote.amount = data.amount;
        quote.amountType = data.amount_type;
        quote.baseFees = data.base_fees;
        quote.baseFeesCurrencyPrefixed = data.base_fees_currency_prefixed;
        quote.baseFeesFormatted = data.base_fees_formatted;
        quote.localAmount = data.local_amount;
        quote.localAmountCurrencyPrefixed = data.local_amount_currency_prefixed;
        quote.localAmountFormatted = data.local_amount_formatted;
        quote.foreignAmount = data.foreign_amount;
        quote.foreignAmountCurrencyPrefixed = data.foreign_amount_currency_prefixed;
        quote.foreignAmountFormatted = data.foreign_amount_formatted;
        if (data.payment_currency) {
            quote.paymentCurrency = Currency.getInstance(data.payment_currency);
        }
        if (data.payment_country) {
            quote.paymentCountry = Country.getInstance(data.payment_country);
        }
        if (data.payout_currency) {
            quote.payoutCurrency = Currency.getInstance(data.payout_currency);
        }
        if (data.payout_country) {
            quote.payoutCountry = Country.getInstance(data.payout_country);
        }
        if (data.payout_method) {
            quote.payoutMethod = PayoutMethod.getInstance(data.payout_method);
        }
        if (data.payout_company) {
            quote.payoutCompany = Company.getInstance(data.payout_company);
        }
        return quote;
    }
}

export default BaseQuote