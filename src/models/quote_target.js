import Country from "@/models/country.js";
import Currency from "@/models/currency.js";

class QuoteTarget {
    /**
     * @type {Country|null}
     */
    country = null;
    /**
     * @type {Currency|null}
     */
    currency = null;

    static getInstance(data) {
        const quoteTarget = new QuoteTarget();
        quoteTarget.country = Country.getInstance(data.country);
        quoteTarget.currency = Currency.getInstance(data.currency);
        return quoteTarget;
    }
}

export default QuoteTarget;