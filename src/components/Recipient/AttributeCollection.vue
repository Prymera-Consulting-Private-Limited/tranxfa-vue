<script setup>
import Country from "@/models/country.js";
import Currency from "@/models/currency.js";
import PayoutMethod from "@/models/payout_method.js";
import PayoutChannel from "@/models/payout_channel.js";
import TextInput from "@/components/Recipient/Attribute/TextInput.vue";
import DeliveryOptionInput from "@/components/Recipient/Attribute/DeliveryOptionInput.vue";
import SubDeliveryOptionInput from "@/components/Recipient/Attribute/SubDeliveryOptionInput.vue";
import MobileNumberInput from "@/components/Recipient/Attribute/MobileNumberInput.vue";
import EmailInput from "@/components/Recipient/Attribute/EmailInput.vue";
import AccountNumberInput from "@/components/Recipient/Attribute/AccountNumberInput.vue";
import PhoneNumberInput from "@/components/Recipient/Attribute/PhoneNumberInput.vue";
import {computed, reactive, ref, watch, watchEffect} from "vue";
import RecipientDataType from "@/enums/recipient_data_type.js";
import Relationship from "@/models/relationship.js";
import RelationshipInput from "@/components/Recipient/Attribute/RelationshipInput.vue";
import Spinner from "@/components/Spinner.vue";
import {useRecipientUtils} from "@/composables/recipient_utils.js";
import Recipient from "@/models/recipient.js";
import TransactionQuote from "@/models/transaction_quote.js";
import NameInput from "@/components/Recipient/Attribute/NameInput.vue";
import SecondNameInput from "@/components/Recipient/Attribute/SecondNameInput.vue";
import ThirdNameInput from "@/components/Recipient/Attribute/ThirdNameInput.vue";
import { debounce } from 'lodash'
import SelectInput from "@/components/Recipient/Attribute/SelectInput.vue";
import {useResourceUtils} from "@/composables/resource_utils.js";
import SubDeliveryOption from "@/models/sub_delivery_option.js";

const resourceUtils = useResourceUtils();
const props = defineProps({
  country: {
    type: Country,
    required: true,
  },
  currency: {
    type: Currency,
    required: true,
  },
  payoutMethod: {
    type: PayoutMethod,
    required: true,
  },
  payoutChannel: {
    type: PayoutChannel,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  relationships: {
    type: Array({type: Relationship}),
    required: true,
  },
  isSubmitted: {
    type: Boolean,
    required: false,
    default: false,
  },
  quote: {
    type: Object(TransactionQuote),
    required: false,
  },
})

const errors = reactive({
  recipient_type: [],
  relationship_id: [],
});

const componentMap = {
  'name': NameInput,
  'second_name': SecondNameInput,
  'third_name': ThirdNameInput,
  'default': TextInput,
  'select': SelectInput,
  'radio': null,
  'delivery_option': DeliveryOptionInput,
  'sub_delivery_option': SubDeliveryOptionInput,
  'account_number': AccountNumberInput,
  'phone_number': PhoneNumberInput,
  'mobile_number': MobileNumberInput,
  'email': EmailInput,
  'address_line_1': null,
  'address_line_2': null,
  'address_line_3': null,
  'address_city': null,
  'address_region': null,
  'address_postcode': null,
}

const input = reactive({
  data: {
    'recipient_type': props.type,
    'relationship_id': null,
  },
});

const confirmAccountNumberInput = ref(null);

for (const attribute of props.payoutChannel.attributes) {
  input.data[attribute.attribute] = null;
  if (attribute.type === RecipientDataType.MOBILE_NUMBER) {
    errors[`${attribute.attribute}.number`] = [];
    errors[`${attribute.attribute}.country`] = [];
  } else if (attribute.type === RecipientDataType.PHONE_NUMBER) {
    errors[`${attribute.attribute}.number`] = [];
    errors[`${attribute.attribute}.country`] = [];
  } else {
    errors[attribute.attribute] = [];
  }
  if (attribute.type === RecipientDataType.ACCOUNT_NUMBER) {
    if (props.payoutChannel.configuration.confirmAccountNumber) {
      input.data[`confirm_${attribute.attribute}`] = confirmAccountNumberInput;
      errors[`confirm_${attribute.attribute}`] = [];
    }
  }
}

const hasSubDeliveryOptionAttribute = computed(() => {
  return !!props.payoutChannel.attributes.find(o => o.type === RecipientDataType.SUB_DELIVERY_OPTION);
});

async function updateRecipientAccountNumberConfirmation(updated) {
  confirmAccountNumberInput.value = updated;
}
async function updateRelationship(relationship) {
  input.data.relationship_id = relationship.id;
}

const isFetchingDeliveryOptions = ref(false);

function loadSubDeliveryOptions(deliveryOption) {
  isFetchingDeliveryOptions.value = true;
  props.payoutChannel.attributes.forEach(function (attribute) {
    if (attribute.type === RecipientDataType.SUB_DELIVERY_OPTION) {
      attribute.options = [];
    }
  });
  resourceUtils.subDeliveryOptions(deliveryOption).then((response) => {
    props.payoutChannel.attributes.forEach(function (attribute) {
      if (attribute.type === RecipientDataType.SUB_DELIVERY_OPTION) {
        attribute.options = response.data.map(o => SubDeliveryOption.getInstance(o));
      }
    });
  }).finally(() => {
    isFetchingDeliveryOptions.value = false;
  });
}

async function updateRecipientInput(updated, attribute) {
  if (attribute.type === RecipientDataType.DELIVERY_OPTION) {
    input.data[attribute.attribute] = updated?.id;
    if (hasSubDeliveryOptionAttribute.value && input.data[attribute.attribute]) {
      loadSubDeliveryOptions(input.data[attribute.attribute])
    }
  } else if (attribute.type === RecipientDataType.SUB_DELIVERY_OPTION) {
    input.data[attribute.attribute] = updated?.id;
  } else if (attribute.type === RecipientDataType.SELECT) {
    input.data[attribute.attribute] = updated?.id;
  } else {
    input.data[attribute.attribute] = updated;
  }
}

const isSaving = ref(false);

const recipientUtils = useRecipientUtils();

const emit = defineEmits([
    'recipient:added',
    'recipient:add:failed',
    'recipient:add:loadingStateUpdated',
]);

async function addRecipient() {
  isSaving.value = true;
  Object.entries(errors).forEach(([key]) => {
    errors[key] = [];
  });
  await recipientUtils.add(props.payoutChannel, input.data, props.quote).then((response) => {
    const recipient = Recipient.getInstance(response.data);
    emit('recipient:added', recipient);
  }).catch((e) => {
    emit('recipient:add:failed');
    if (e.status === 422) {
      for (const [key, value] of Object.entries(e.response.data.errors)) {
        errors[key] = value;
      }
    } else {
      console.error(e)
      isSaving.value = false;
      throw e;
    }
  }).finally(() => {
    isSaving.value = false;
  });
}

const isLookingUp = ref(false);
const nameLookup = computed(() => {
  let requirements = props.payoutChannel.configuration?.nameLookupRequirements;
  if (requirements?.length === 0) {
    requirements = props.payoutChannel.configuration?.nameValidationRequirements;
  }
  if (requirements?.length > 0) {
    return {
      attributes: requirements.map((attribute => {
        return {
          attribute: attribute,
          isValid: input.data[attribute] !== null && input.data[attribute] !== undefined && input.data[attribute].length > 0
        }
      })),
      isValid: requirements.every((attribute) => {
        if (input.data[attribute] === null || input.data[attribute] === undefined) {
          return false;
        }
        const payoutChannelAttribute = props.payoutChannel.attributes.find((payoutChannelAttribute) => {
          return payoutChannelAttribute.attribute === attribute;
        });
        if (payoutChannelAttribute?.minLength && input.data[attribute].length < payoutChannelAttribute.minLength) {
          return false;
        }
        if (payoutChannelAttribute?.maxLength && input.data[attribute].length > payoutChannelAttribute.maxLength) {
          return false;
        }
        if (payoutChannelAttribute?.exactLength && input.data[attribute].length !== payoutChannelAttribute.exactLength) {
          return false;
        }
        if(payoutChannelAttribute.regexPattern) {
          if (payoutChannelAttribute.regexPattern.startsWith('/') && payoutChannelAttribute.regexPattern.lastIndexOf('/') > 0) {
            const lastSlashIndex = payoutChannelAttribute.regexPattern.lastIndexOf('/');
            const body = payoutChannelAttribute.regexPattern.slice(1, lastSlashIndex);
            const flags = payoutChannelAttribute.regexPattern.slice(lastSlashIndex + 1);
            const regex = new RegExp(body, flags);
            if (! regex.test(input.data[attribute])) {
              return false;
            }
          } else {
            const regex = new RegExp(payoutChannelAttribute.regexPattern);
            if (! regex.test(input.data[attribute])) {
              return false;
            }
          }
        }

        return input.data[attribute].length > 0;
      }),
    };
  }
  return [];
});

const doLookup = () => {
  if (nameLookup.value.isValid) {
    isLookingUp.value = true;
    const query = {};
    const nameAttribute = props.payoutChannel.attributes.find((attribute) => {
      return attribute.type === RecipientDataType.NAME;
    });
    errors[nameAttribute.attribute] = [];
    for (const attribute of nameLookup.value.attributes) {
      query[attribute.attribute] = input.data[attribute.attribute];
    }
    recipientUtils.lookup(props.payoutChannel, query).then((response) => {
      input.data[nameAttribute.attribute] = response.data.name;
    }).catch((e) => {
      input.data[nameAttribute.attribute] = null;
      errors[nameAttribute.attribute] = [e.response.data.message];
    }).finally(() => {
      isLookingUp.value = false;
    });
  }
}

watchEffect(() => {
  if (props.isSubmitted && props.quote && !isSaving.value) {
    addRecipient();
  }
});

const debouncedLookup = debounce(() => {
  doLookup();
}, 1000);

watch(nameLookup, function (newValue) {
  const nameAttribute = props.payoutChannel.attributes.find((attribute) => {
    return attribute.type === RecipientDataType.NAME;
  });
  input.data[nameAttribute.attribute] = null;
  if (newValue.isValid) {
    debouncedLookup();
  }
});

watchEffect(() => {
  emit('recipient:add:loadingStateUpdated', isSaving.value || isLookingUp.value || false);
})
</script>

<template>
  <form @submit.prevent="addRecipient" class="space-y-6 sm:min-w-md">
    <div v-for="attribute in payoutChannel.attributes" :key="attribute.id">
      <template v-if="(componentMap[attribute.type] || componentMap['default']) === AccountNumberInput">
        <AccountNumberInput v-bind:attribute="attribute" :id="attribute.attribute">
          <div class="space-y-6">
            <div>
              <label :for="attribute.attribute" :class="[errors[attribute.attribute]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">
                {{ attribute.label }}
                <span v-if="attribute.isRequired === true" class="ml-0.5 text-red-500">*</span>
              </label>
              <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
              <TextInput v-on:recipient:input:updated="updateRecipientInput" v-bind:attribute="attribute" :id="attribute.attribute" />
              <p v-if="errors[attribute.attribute]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[attribute.attribute][0] }}</p>
            </div>
            <div v-if="props.payoutChannel.configuration.confirmAccountNumber">
              <label :for="`confirm-input-${attribute.attribute}`" :class="[errors[`confirm_${attribute.attribute}`]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">
                Confirm {{ attribute.label }}
                <span v-if="attribute.isRequired === true" class="ml-0.5 text-red-500">*</span>
              </label>
              <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
              <TextInput v-on:recipient:input:updated="updateRecipientAccountNumberConfirmation" v-bind:attribute="attribute" :id="`confirm-input-${attribute.attribute}`" />
              <p v-if="errors[`confirm_${attribute.attribute}`]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[`confirm_${attribute.attribute}`][0] }}</p>
            </div>
          </div>
        </AccountNumberInput>
      </template>
      <template v-else>
        <template v-if="(componentMap[attribute.type] || componentMap['default']) === MobileNumberInput || (componentMap[attribute.type] || componentMap['default']) === PhoneNumberInput">
          <label :for="attribute.attribute" :class="[errors[`${attribute.attribute}.country`]?.length > 0 || errors[`${attribute.attribute}.number`]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">
            {{ attribute.label }}
            <span v-if="attribute.isRequired === true" class="ml-0.5 text-red-500">*</span>
          </label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
          <component
              v-bind:country="props.country"
              v-on:recipient:input:updated="updateRecipientInput"
              :is="componentMap[attribute.type] || componentMap['default']"
              v-bind:attribute="attribute"
              :id="attribute.attribute"
          />
          <p v-if="errors[`${attribute.attribute}.country`]?.length > 0 || errors[`${attribute.attribute}.number`]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[`${attribute.attribute}.country`][0] || errors[`${attribute.attribute}.number`][0] }}</p>
        </template>
        <template v-else>
          <label :for="attribute.attribute" :class="[errors[attribute.attribute]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">
            {{ attribute.label }}
            <span v-if="attribute.isRequired === true" class="ml-0.5 text-red-500">*</span>
          </label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
          <component
              v-bind:disableNameInput="payoutChannel.configuration?.nameLookupRequirements?.length > 0"
              v-bind:isLookingUp="isLookingUp"
              v-bind:input="input.data"
              v-on:recipient:input:updated="updateRecipientInput"
              :is="componentMap[attribute.type] || componentMap['default']"
              v-bind:attribute="attribute"
              :id="attribute.attribute"
          />
          <p v-if="errors[attribute.attribute]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[attribute.attribute][0] }}</p>
        </template>
      </template>
    </div>
    <div>
      <label for="relationship" :class="[errors?.relationship_id?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">
        Relation
        <span class="ml-0.5 text-red-500">*</span>
      </label>
      <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please select your relation with the recipient.</p>
      <RelationshipInput v-bind:relationships="relationships" v-on:recipient:relationship:updated="updateRelationship" />
      <p v-if="errors?.relationship_id?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors.relationship_id[0] }}</p>
    </div>
    <button v-if="! props.quote" :class="{'opacity-60' : isSaving}" :disabled="isSaving" type="submit" class="block w-full bg-brand-700 text-white text-center py-2.5 rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer text-sm">
      <span v-if="isSaving" class="flex justify-center items-center">
        <Spinner :class="'w-5 h-5 mr-3'"/>
        <span>Saving...</span>
      </span>
      <span v-else>Save Recipient</span>
    </button>
  </form>
</template>