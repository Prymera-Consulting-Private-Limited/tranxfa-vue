class PayoutChannelAttribute {
    /**
     * @type {RecipientDataType|null}
     */
    type = null;

    /**
     * @type {string|null}
     */
    context = null;

    /**
     * @type {boolean}
     */
    isRequired = false;

    /**
     * @type {string|null}
     */
    label = null;

    /**
     * @type {string|null}
     */
    attribute = null;

    /**
     * @type {string|null}
     */
    prefixAddon = null;

    /**
     * @type {string|null}
     */
    suffixAddon = null;

    /**
     * @type {string|null}
     */
    helpText = null;

    /**
     * @type {string|null}
     */
    regexPattern = null;

    /**
     * @type {string|null}
     */
    regexFailureMessage = null;

    /**
     * @type {string|null}
     */
    mask = null;

    /**
     * @type {int|null}
     */
    minLength = null;

    /**
     * @type {int|null}
     */
    maxLength = null;

    /**
     * @type {int|null}
     */
    exactLength = null;

    /**
     * @type {string|null}
     */
    minValue = null;

    /**
     * @type {string|null}
     */
    maxValue = null;

    /**
     * @type {string|null}
     */
    exactValue = null;

    /**
     * @type {int|null}
     */
    viewOrder = null;

    static getInstance(data) {
        const payoutChannelAttribute = new PayoutChannelAttribute();
        payoutChannelAttribute.type = data.type;
        payoutChannelAttribute.context = data.context;
        payoutChannelAttribute.isRequired = data.is_required;
        payoutChannelAttribute.label = data.label;
        payoutChannelAttribute.attribute = data.attribute;
        payoutChannelAttribute.prefixAddon = data.prefix_addon;
        payoutChannelAttribute.suffixAddon = data.suffix_addon;
        payoutChannelAttribute.helpText = data.help_text;
        payoutChannelAttribute.regexPattern = data.regex_pattern;
        payoutChannelAttribute.regexFailureMessage = data.regex_failure_message;
        payoutChannelAttribute.mask = data.mask;
        payoutChannelAttribute.minLength = data.min_length;
        payoutChannelAttribute.maxLength = data.max_length;
        payoutChannelAttribute.exactLength = data.exact_length;
        payoutChannelAttribute.minValue = data.min_value;
        payoutChannelAttribute.maxValue = data.max_value;
        payoutChannelAttribute.exactValue = data.exact_value;
        payoutChannelAttribute.viewOrder = data.view_order;
        return payoutChannelAttribute;
    }
}

export default PayoutChannelAttribute;