import BaseQuote from "@/models/base_quote.js";
import Recipient from "@/models/recipient.js";

class TransactionQuote extends BaseQuote {
    /**
     * @type {Recipient[]}
     */
    recipients = [];

    recipient = null;

    purposes = [];

    static getInstance(data) {
        const quote = new TransactionQuote();
        BaseQuote.getInstance(quote, data);
        if (data.recipients.length > 0) {
            quote.recipients = data.recipients.map((data) => {
                return Recipient.getInstance(data);
            });
        }
        if (data.recipient) {
            quote.recipient = Recipient.getInstance(data.recipient);
        }
        if (data.purposes?.length > 0) {
            quote.purposes = data.purposes.map((data) => {
                return data;
            });
        }
        return quote;
    }
}

export default TransactionQuote;