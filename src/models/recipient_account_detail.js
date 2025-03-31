import DeliveryOption from "@/models/delivery_option.js";

class RecipientAccountDetail {
    /**
     * @type {String|null}
     */
    accountNumber = null;

    /**
     * @type {DeliveryOption|null}
     */
    institution = null;

    static getInstance(data) {
        const recipientAccountDetail = new RecipientAccountDetail();
        recipientAccountDetail.accountNumber = data.account_number;
        if (data.institution) {
            recipientAccountDetail.institution = DeliveryOption.getInstance(data.institution);
        }

        return recipientAccountDetail;
    }
}

export default RecipientAccountDetail;