import Country from "@/models/country.js";
import Currency from "@/models/currency.js";

class QuoteSource {
    /**
     * @type {Country|null}
     */
    country = null;
    /**
     * @type {Currency|null}
     */
    currency = null;

    static getInstance(data) {
        const quoteSource = new QuoteSource();
        quoteSource.country = Country.getInstance(data.country);
        quoteSource.currency = Currency.getInstance(data.currency);
        return quoteSource;
    }
}

export default QuoteSource;