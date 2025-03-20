import BaseTransaction from "@/models/base_transaction.js";

class BaseQuote extends BaseTransaction {


    /**
     * @type {String|null}
     */
    amount = null;

    /**
     * @type {string|null}
     */
    amountType = null;

    static getInstance(quote, data) {

        quote.amount = data.amount;
        quote.amountType = data.amount_type;
        BaseTransaction.getInstance(quote, data);

        return quote;
    }
}

export default BaseQuote