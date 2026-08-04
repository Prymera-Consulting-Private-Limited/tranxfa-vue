import BaseTransaction from "@/models/base_transaction.js";
import QuoteCoupon from "@/models/quote_coupon.js";

class BaseQuote extends BaseTransaction {


    /**
     * @type {String|null}
     */
    amount = null;

    /**
     * @type {string|null}
     */
    amountType = null;

    /**
     * @type {QuoteCoupon|null}
     */
    coupon = null;

    static getInstance(quote, data) {

        quote.amount = data.amount;
        quote.amountType = data.amount_type;
        // Assigned unconditionally: the server re-evaluates the coupon on every
        // quote change and drops it when it no longer applies, so a null in the
        // response has to clear it rather than leave the previous one in place.
        quote.coupon = data.coupon ? QuoteCoupon.getInstance(data.coupon) : null;
        BaseTransaction.getInstance(quote, data);

        return quote;
    }
}

export default BaseQuote