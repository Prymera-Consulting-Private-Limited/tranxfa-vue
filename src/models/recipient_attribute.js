import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";
import DeliveryOption from "@/models/delivery_option.js";
import RecipientDataType from "@/enums/recipient_data_type.js";
import Country from "@/models/country.js";

class RecipientAttribute extends PayoutChannelAttribute {
    /**
     * @type {Object|String|null}
     */
    value = null;

    static getInstance(data) {
        let recipientAttribute = new RecipientAttribute();
        recipientAttribute.type = data.type;
        recipientAttribute.context = data.context;
        recipientAttribute.isRequired = data.is_required;
        recipientAttribute.label = data.label;
        recipientAttribute.attribute = data.attribute;
        recipientAttribute.prefixAddon = data.prefix_addon;
        recipientAttribute.suffixAddon = data.suffix_addon;
        recipientAttribute.helpText = data.help_text;
        recipientAttribute.regexPattern = data.regex_pattern;
        recipientAttribute.regexFailureMessage = data.regex_failure_message;
        recipientAttribute.mask = data.mask;
        recipientAttribute.minLength = data.min_length;
        recipientAttribute.maxLength = data.max_length;
        recipientAttribute.exactLength = data.exact_length;
        recipientAttribute.minValue = data.min_value;
        recipientAttribute.maxValue = data.max_value;
        recipientAttribute.exactValue = data.exact_value;
        recipientAttribute.viewOrder = data.view_order;
        if (data.options?.length > 0) {
            recipientAttribute.options = data.options.map(option => DeliveryOption.getInstance(option));
        }
        if (data.type === RecipientDataType.MOBILE_NUMBER || data.type === RecipientDataType.PHONE_NUMBER) {
            if (data.value) {
                recipientAttribute.value = {
                    country: Country.getInstance(data.value.country),
                    number: data.value.number,
                };
                return recipientAttribute;
            }

        } else if (data.type === RecipientDataType.DELIVERY_OPTION) {
            if (data.value) {
                recipientAttribute.value = DeliveryOption.getInstance(data.value);
                return recipientAttribute;
            }

        } else {
            recipientAttribute.value = data.value;
        }
        return recipientAttribute;
    }
}

export default RecipientAttribute;