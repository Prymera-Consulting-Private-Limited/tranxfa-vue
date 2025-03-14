import Relationship from "@/models/relationship.js";
import PayoutChannel from "@/models/payout_channel.js";
import RecipientAttribute from "@/models/recipient_attribute.js";

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

    static getInstance(data) {
        let recipient = new Recipient();
        recipient.id = data.id;
        recipient.recipientType = data.recipient_type;
        recipient.firstName = data.first_name;
        recipient.middleName = data.middle_name;
        recipient.lastName = data.last_name;
        recipient.entityName = data.entity_name;
        recipient.fullName = data.full_name;
        recipient.relationship = Relationship.getInstance(data.relationship);
        if (data.channel) {
            recipient.channel = PayoutChannel.getInstance(data.channel);
        }

        if (data.attributes?.length > 0) {
            recipient.attributes = data.attributes.map(attribute => RecipientAttribute.getInstance(attribute));
        }
        return recipient;
    }
}

export default Recipient;