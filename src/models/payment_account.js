import Country from "@/models/country.js";

class PaymentAccount {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {Country|null}
     */
    country = null;

    /**
     * @type {String|null}
     */
    institution = null;

    /**
     * @type {String|null}
     */
    institutionLocationCode = null;

    /**
     * @type {String|null}
     */
    accountHolderName = null;

    /**
     * @type {String|null}
     */
    accountNumber = null;

    static getInstance(data) {
        const paymentAccount = new PaymentAccount();
        paymentAccount.id = data.id;
        if (data.country) {
            paymentAccount.country = Country.getInstance(data.country);
        }
        paymentAccount.institution = data.institution;
        paymentAccount.institutionLocationCode = data.institution_location_code;
        paymentAccount.accountHolderName = data.account_holder_name;
        paymentAccount.accountNumber = data.account_number;
        return paymentAccount;
    }
}

export default PaymentAccount;