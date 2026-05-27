import BaseQuote from "@/models/base_quote.js";
import Recipient from "@/models/recipient.js";
import PaymentMethod from "@/models/payment_method.js";
import QuotePendingDocument from "@/models/quote_pending_document.js";
import LinkedPaymentAccount from "@/models/linked_payment_account.js";

class TransactionQuote extends BaseQuote {
    /**
     * @type {Recipient[]}
     */
    recipients = [];

    /**
     * @type {Recipient|null}
     */
    recipient = null;

    purposes = [];

    /**
     *
     * @type {LinkedPaymentAccount[]}
     */
    linkedPaymentAccounts = [];

    /**
     * @type {PaymentMethod[]}
     */
    paymentMethods = [];

    /**
     * @type {QuotePendingDocument[]}
     */
    pendingDocuments = [];

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
        if (data.payment_methods?.length > 0) {
            quote.paymentMethods = data.payment_methods.map((data) => {
                return PaymentMethod.getInstance(data);
            });
        }
        if (data.pending_documents?.length > 0) {
            quote.pendingDocuments = data.pending_documents.map((data) => {
                return QuotePendingDocument.getInstance(data);
            });
        }
        if (data.linked_accounts?.length > 0) {
            quote.linkedPaymentAccounts = data.linked_accounts.map((data) => {
                return LinkedPaymentAccount.getInstance(data);
            });
        }
        return quote;
    }
}

export default TransactionQuote;