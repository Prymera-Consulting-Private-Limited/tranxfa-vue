import Country from "@/models/country.js";
import Currency from "@/models/currency.js";
import PayoutMethod from "@/models/payout_method.js";
import QuoteSource from "@/models/quote_source.js";
import QuoteTarget from "@/models/quote_target.js";
import AmountType from "@/enums/amount_type.js";
import Company from "@/models/company.js";

class Quote {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {QuoteSource[]}
     */
    sources = [];

    /**
     * @type {QuoteTarget[]}
     */
    targets = [];

    /**
     * @type {string|null}
     */
    exchangeRate = null;

    /**
     * @type {string|null}
     */
    exchangeRateDate = null;

    /**
     * @type {string|null}
     */
    exchangeRateFormatted = null;

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
     *
     * @type {PayoutMethod[]}
     */
    payoutMethods = [];

    /**
     * @type {PayoutMethod|null}
     */
    payoutMethod = null;

    /**
     *
     * @type {Company[]}
     */
    payoutCompanies = [];

    /**
     * @type {Company|null}
     */
    payoutCompany = null;

    /**
     * @type {String|null}
     */
    amount = null;

    /**
     * @type {AmountType|null}
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

    static getInstance(data) {
        const quote = new Quote();
        quote.id = data?.id;
        quote.exchangeRate = data.exchange_rate;
        quote.exchangeRateDate = data.exchange_rate_date;
        quote.exchangeRateFormatted = data.exchange_rate_formatted;
        quote.amount = data.amount;
        quote.amountType = AmountType[data.amount_type];
        quote.baseFees = data.base_fees;
        quote.baseFeesCurrencyPrefixed = data.base_fees_currency_prefixed;
        quote.baseFeesFormatted = data.base_fees_formatted;
        quote.localAmount = data.local_amount;
        quote.localAmountCurrencyPrefixed = data.local_amount_currency_prefixed;
        quote.localAmountFormatted = data.local_amount_formatted;
        quote.foreignAmount = data.foreign_amount;
        quote.foreignAmountCurrencyPrefixed = data.foreign_amount_currency_prefixed;
        quote.foreignAmountFormatted = data.foreign_amount_formatted;
        if (data.sources.length > 0) {
            quote.sources = data.sources.map((data) => {
                return QuoteSource.getInstance(data);
            });
        }
        if (data.payment_currency) {
            quote.paymentCurrency = Currency.getInstance(data.payment_currency);
        }
        if (data.payment_country) {
            quote.paymentCountry = Country.getInstance(data.payment_country);
        }
        if (data.targets.length > 0) {
            quote.targets = data.targets.map((data) => {
                return QuoteTarget.getInstance(data);
            });
        }
        if (data.payout_currency) {
            quote.payoutCurrency = Currency.getInstance(data.payout_currency);
        }
        if (data.payout_country) {
            quote.payoutCountry = Country.getInstance(data.payout_country);
        }
        if (data.payout_methods.length > 0) {
            quote.payoutMethods = data.payout_methods.map((data) => {
                return PayoutMethod.getInstance(data);
            });
        }
        if (data.payout_method) {
            quote.payoutMethod = PayoutMethod.getInstance(data.payout_method);
        }
        if (data.payout_companies.length > 0) {
            quote.payoutCompanies = data.payout_companies.map((data) => {
                return Company.getInstance(data);
            });
        }
        if (data.payout_company) {
            quote.payoutCompany = Company.getInstance(data.payout_company);
        }
        return quote;
    }
}

export default Quote;