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
    name = null;

    /**
     * @type {String|null}
     */
    secondName = null;

    /**
     * @type {String|null}
     */
    thirdName = null;

    /**
     * @type {String|null}
     */
    wholeName = null;

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
        recipient.name = data.name;
        recipient.secondName = data.second_name;
        recipient.thirdName = data.third_name;
        recipient.wholeName = data.whole_name;
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