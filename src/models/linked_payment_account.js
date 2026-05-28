import PaymentMethod from "@/models/payment_method.js";

class LinkedPaymentAccount {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    accountNumber = null;

    /**
     * @type {string|null}
     */
    accountType = null;

    /**
     * @type {string|null}
     */
    displayName = null;

    /**
     * @type {string|null}
     */
    institutionName = null;

    /**
     * @type {string|null}
     */
    createdAt = null;

    /**
     * @type {string|null}
     */
    updatedAt = null;

    /**
     * @type {string|null}
     */
    lastUsedAt = null;

    /**
     * @type {PaymentMethod|null}
     */
    paymentMethod = null;

    /**
     * @type {PaymentProvider|null}
     */
    paymentProvider = null;

    static getInstance(data) {
        const linkedPaymentAccount = new LinkedPaymentAccount();
        linkedPaymentAccount.id = data.id;
        linkedPaymentAccount.accountNumber = data.account_number;
        linkedPaymentAccount.accountType = data.account_type;
        linkedPaymentAccount.displayName = data.display_name;
        linkedPaymentAccount.holderName = data.holder_name;
        linkedPaymentAccount.institutionName = data.institution_name;
        linkedPaymentAccount.createdAt = data.created_at;
        linkedPaymentAccount.updatedAt = data.updated_at;
        linkedPaymentAccount.lastUsedAt = data.last_used_at;
        if (data.payment_method) {
            linkedPaymentAccount.paymentMethod = PaymentMethod.getInstance(data.payment_method);
        }
        if (data.provider) {
            linkedPaymentAccount.paymentProvider = PaymentMethod.getInstance(data.provider);
        }
        return linkedPaymentAccount
    }
}

export default LinkedPaymentAccount;