import ClientPaymentAccountAttribute from "@/models/client_payment_account_attribute.js";

class ClientPaymentAccount {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    institutionName = null;

    /**
     * @type {String|null}
     */
    instruction = null;

    /**
     * @type {Number|null}
     */
    paymentReference = null;

    /**
     * @type {String|null}
     */
    waitTimeMessage = null;

    /**
     * @type {ClientPaymentAccountAttribute[]}
     */
    attributes = [];

    static getInstance(data) {
        const account = new ClientPaymentAccount();
        account.id = data.id;
        account.institutionName = data.institution_name;
        account.instruction = data.instruction_text;
        account.paymentReference = data.payment_reference;
        account.waitTimeMessage = data.wait_time_message;
        if (data.attributes?.length > 0) {
            account.attributes = data.attributes.map(o => ClientPaymentAccountAttribute.getInstance(o));
        }
        return account;
    }
}

export default ClientPaymentAccount;