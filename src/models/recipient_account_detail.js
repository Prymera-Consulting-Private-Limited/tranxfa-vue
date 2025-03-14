import DeliveryOption from "@/models/delivery_option.js";

class RecipientAccountDetail {
    /**
     * @type {String|null}
     */
    accountNumber = null;

    /**
     * @type {String|null}
     */
    accountHolderName = null;

    /**
     * @type {DeliveryOption|null}
     */
    institution = null;

    static getInstance(data) {
        const recipientAccountDetail = new RecipientAccountDetail();
        recipientAccountDetail.accountNumber = data.account_number;
        recipientAccountDetail.accountHolderName = data.account_holder_name;
        if (data.institution) {
            recipientAccountDetail.institution = DeliveryOption.getInstance(data.institution);
        }

        return recipientAccountDetail;
    }
}

export default RecipientAccountDetail;