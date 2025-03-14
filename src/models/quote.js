import PayoutMethod from "@/models/payout_method.js";
import QuoteSource from "@/models/quote_source.js";
import QuoteTarget from "@/models/quote_target.js";
import Company from "@/models/company.js";
import BaseQuote from "@/models/base_quote.js";

class Quote extends BaseQuote {
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
    exchangeRateDate = null;

    /**
     *
     * @type {PayoutMethod[]}
     */
    payoutMethods = [];

    /**
     *
     * @type {Company[]}
     */
    payoutCompanies = [];

    static getInstance(data) {
        const quote = new Quote();
        BaseQuote.getInstance(quote, data);
        quote.exchangeRateDate = data.exchange_rate_date;
        if (data.sources.length > 0) {
            quote.sources = data.sources.map((data) => {
                return QuoteSource.getInstance(data);
            });
        }
        if (data.targets.length > 0) {
            quote.targets = data.targets.map((data) => {
                return QuoteTarget.getInstance(data);
            });
        }
        if (data.payout_methods.length > 0) {
            quote.payoutMethods = data.payout_methods.map((data) => {
                return PayoutMethod.getInstance(data);
            });
        }
        if (data.payout_companies.length > 0) {
            quote.payoutCompanies = data.payout_companies.map((data) => {
                return Company.getInstance(data);
            });
        }
        return quote;
    }
}

export default Quote;