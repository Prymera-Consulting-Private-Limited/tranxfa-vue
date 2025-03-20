import Currency from "@/models/currency.js";
import Country from "@/models/country.js";
import PayoutMethod from "@/models/payout_method.js";
import Company from "@/models/company.js";

class BaseTransaction {
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

    /**
     * @param {Quote|TransactionQuote|Transaction} obj
     * @param {object} data
     * @return {Quote|TransactionQuote|Transaction}
     */
    static getInstance(obj, data) {
        obj.id = data?.id;
        obj.exchangeRate = data.exchange_rate;
        obj.exchangeRateFormatted = data.exchange_rate_formatted;
        obj.baseFees = data.base_fees;
        obj.baseFeesCurrencyPrefixed = data.base_fees_currency_prefixed;
        obj.baseFeesFormatted = data.base_fees_formatted;
        obj.localAmount = data.local_amount;
        obj.localAmountCurrencyPrefixed = data.local_amount_currency_prefixed;
        obj.localAmountFormatted = data.local_amount_formatted;
        obj.foreignAmount = data.foreign_amount || data.payout_amount;
        obj.foreignAmountCurrencyPrefixed = data.foreign_amount_currency_prefixed || data.payout_amount_currency_prefixed;
        obj.foreignAmountFormatted = data.foreign_amount_formatted || data.payout_amount_formatted;
        if (data.payment_currency) {
            obj.paymentCurrency = Currency.getInstance(data.payment_currency);
        }
        if (data.payment_country) {
            obj.paymentCountry = Country.getInstance(data.payment_country);
        }
        if (data.payout_currency) {
            obj.payoutCurrency = Currency.getInstance(data.payout_currency);
        }
        if (data.payout_country) {
            obj.payoutCountry = Country.getInstance(data.payout_country);
        }
        if (data.payout_method) {
            obj.payoutMethod = PayoutMethod.getInstance(data.payout_method);
        }
        if (data.payout_company) {
            obj.payoutCompany = Company.getInstance(data.payout_company);
        }
    }
}

export default BaseTransaction;