import Relationship from "@/models/relationship.js";
import PayoutChannel from "@/models/payout_channel.js";
import RecipientAttribute from "@/models/recipient_attribute.js";
import RecipientAccountDetail from "@/models/recipient_account_detail.js";
import RecipientTransactionSummary from "@/models/recipient_transaction_summary.js";

class Recipient {

    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    recipientType = null;

    /**
     * @type {String|null}
     */
    firstName = null;

    /**
     * @type {String|null}
     */
    middleName = null;

    /**
     * @type {String|null}
     */
    lastName = null;

    /**
     * @type {String|null}
     */
    entityName = null;

    /**
     * @type {String|null}
     */
    fullName = null;

    /**
     * @type {Relationship|null}
     */
    relationship = null;

    /**
     * @type {PayoutChannel|null}
     */
    channel = null;

    /**
     * @type {RecipientAttribute[]}
     */
    attributes = [];

    /**
     * @type {RecipientAccountDetail|null}
     */
    accountDetail = null;

    accountDetailHashMap = [];

    /**
     * @type {RecipientTransactionSummary|null}
     */
    transactionSummary = null;

    static getInstance(data) {
        let recipient = new Recipient();
        recipient.id = data.id;
        recipient.recipientType = data.recipient_type;
        recipient.firstName = data.first_name;
        recipient.middleName = data.middle_name;
        recipient.lastName = data.last_name;
        recipient.entityName = data.entity_name;
        recipient.fullName = data.full_name;
        if (data.relationship) {
            recipient.relationship = Relationship.getInstance(data.relationship);
        }
        if (data.channel) {
            recipient.channel = PayoutChannel.getInstance(data.channel);
        }
        if (data.account_detail) {
            recipient.accountDetail = RecipientAccountDetail.getInstance(data.account_detail);
        }
        if (data.account_detail_hashmap) {
            recipient.accountDetailHashMap = data.account_detail_hashmap || [];
        }
        if (data.transaction_summary) {
            recipient.transactionSummary = RecipientTransactionSummary.getInstance(data.transaction_summary);

        }

        if (data.attributes?.length > 0) {
            recipient.attributes = data.attributes.map(attribute => RecipientAttribute.getInstance(attribute));
        }
        return recipient;
    }
}

export default Recipient;