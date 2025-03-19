<script setup>
import Country from "@/models/country.js";
import Currency from "@/models/currency.js";
import PayoutMethod from "@/models/payout_method.js";
import PayoutChannel from "@/models/payout_channel.js";
import RecipientType from "@/enums/recipient_type.js";
import FirstNameInput from "@/components/Recipient/Attribute/FirstNameInput.vue";
import MiddleNameInput from "@/components/Recipient/Attribute/MiddleNameInput.vue";
import LastNameInput from "@/components/Recipient/Attribute/LastNameInput.vue";
import EntityNameInput from "@/components/Recipient/Attribute/EntityNameInput.vue";
import AccountHolderNameInput from "@/components/Recipient/Attribute/AccountHolderNameInput.vue";
import TextInput from "@/components/Recipient/Attribute/TextInput.vue";
import DeliveryOptionInput from "@/components/Recipient/Attribute/DeliveryOptionInput.vue";
import MobileNumberInput from "@/components/Recipient/Attribute/MobileNumberInput.vue";
import EmailInput from "@/components/Recipient/Attribute/EmailInput.vue";
import AccountNumberInput from "@/components/Recipient/Attribute/AccountNumberInput.vue";
import PhoneNumberInput from "@/components/Recipient/Attribute/PhoneNumberInput.vue";
import {reactive, ref, watchEffect} from "vue";
import RecipientDataType from "@/enums/recipient_data_type.js";
import Relationship from "@/models/relationship.js";
import RelationshipInput from "@/components/Recipient/Attribute/RelationshipInput.vue";
import Spinner from "@/components/Spinner.vue";
import {useRecipientUtils} from "@/composables/recipient_utils.js";
import Recipient from "@/models/recipient.js";
import TransactionQuote from "@/models/transaction_quote.js";

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
  entity_name: [],
  first_name: [],
  middle_name: [],
  last_name: [],
  recipient_type: [],
  relationship_id: [],
});

const componentMap = {
  'default': TextInput,
  'select': null,
  'radio': null,
  'delivery_option': DeliveryOptionInput,
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
  'account_holder_name': AccountHolderNameInput,
}

const input = reactive({
  data: {
    'recipient_type': props.type,
    'relationship_id': null,
  },
});
if (props.type === RecipientType.BUSINESS) {
  input.data['entity_name'] = null;
} else {
  input.data['first_name'] = null;
  if (props.payoutChannel.configuration.askForMiddleName) {
    input.data['middle_name'] = null;
  }
  input.data['last_name'] = null;
}

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
    input.data[`confirm_${attribute.attribute}`] = confirmAccountNumberInput;
    errors[`confirm_${attribute.attribute}`] = [];
  }
}

async function updateRecipientFirstName(updated) {
  input.data.first_name = updated;
}

async function updateRecipientMiddleName(updated) {
  input.data.middle_name = updated;
}
async function updateRecipientLastName(updated) {
  input.data.last_name = updated;
}
async function updateRecipientEntityName(updated) {
  input.data.entity_name = updated;
}
async function updateRecipientAccountNumberConfirmation(updated) {
  confirmAccountNumberInput.value = updated;
}
async function updateRelationship(relationship) {
  input.data.relationship_id = relationship.id;
}

async function updateRecipientInput(updated, attribute) {
  if (attribute.type === RecipientDataType.DELIVERY_OPTION) {
    input.data[attribute.attribute] = updated.id;
    return;
  }
  input.data[attribute.attribute] = updated;
}

const isSaving = ref(false);

const recipientUtils = useRecipientUtils();

const emit = defineEmits([
    'recipient:added',
    'recipient:add:failed',
]);

async function addRecipient() {
  isSaving.value = true;
  Object.entries(errors).forEach(([key]) => {
    errors[key] = [];
  });
  await recipientUtils.add(props.payoutChannel, input.data).then((response) => {
    const recipient = Recipient.getInstance(response.data);
    emit('recipient:added', recipient);
  }).catch((e) => {
    if (e.status === 422) {
      for (const [key, value] of Object.entries(e.response.data.errors)) {
        errors[key] = value;
      }
    } else {
      console.error(e)
      throw e;
    }
    emit('recipient:add:failed');
  }).finally(() => {
    isSaving.value = false;
  });
}

watchEffect(() => {
  if (props.isSubmitted && props.quote && !isSaving.value) {
    addRecipient();
  }
});
</script>

<template>
  <form @submit.prevent="addRecipient" class="space-y-6">
    <div v-if="type === RecipientType.BUSINESS">
      <div >
        <div>
          <label for="entity-name" :class="[errors?.entity_name?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Entity Name</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please enter the entity name as it appears of their incorporation certificate or similar documents.</p>
          <EntityNameInput v-on:recipient:input:updated="updateRecipientEntityName" :id="`entity-name`" />
          <p v-if="errors?.entity_name?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors.entity_name[0] }}</p>
        </div>
      </div>
    </div>
    <div v-else>
      <div :class="[
          payoutChannel.configuration.askForMiddleName ? 'lg:grid-cols-3' :  'lg:grid-cols-2'
      ]" class="grid grid-cols-1 gap-6">
        <div>
          <label for="first-name" :class="[errors?.first_name?.length ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">First Name</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please enter the first name of the recipient as it appears of their identity document.</p>
          <FirstNameInput v-on:recipient:input:updated="updateRecipientFirstName" :id="`first-name`" />
          <p v-if="errors?.first_name?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors.first_name[0] }}</p>
        </div>
        <div v-if="payoutChannel.configuration.askForMiddleName">
          <label for="middle-name" :class="[errors?.middle_name?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Middle Name</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please enter the middle name of the recipient as it appears of their identity document.</p>
          <MiddleNameInput v-on:recipient:input:updated="updateRecipientMiddleName" :id="`middle-name`" />
          <p v-if="errors?.middle_name?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors.middle_name[0] }}</p>
        </div>
        <div>
          <label for="last-name" :class="[errors?.last_name?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Last Name</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please enter the last name of the recipient as it appears of their identity document.</p>
          <LastNameInput v-on:recipient:input:updated="updateRecipientLastName" :id="`last-name`" />
          <p v-if="errors?.last_name?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors.last_name[0] }}</p>
        </div>
      </div>
    </div>

    <div v-for="attribute in payoutChannel.attributes" :key="attribute.id">
      <template v-if="(componentMap[attribute.type] || componentMap['default']) === AccountNumberInput">
        <AccountNumberInput v-bind:attribute="attribute" :id="attribute.attribute">
          <div class="space-y-6">
            <div>
              <label :for="attribute.attribute" :class="[errors[attribute.attribute]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">{{ attribute.label }}</label>
              <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
              <TextInput v-on:recipient:input:updated="updateRecipientInput" v-bind:attribute="attribute" :id="attribute.attribute" />
              <p v-if="errors[attribute.attribute]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[attribute.attribute][0] }}</p>
            </div>
            <div>
              <label :for="`confirm-input-${attribute.attribute}`" :class="[errors[`confirm_${attribute.attribute}`]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Confirm {{ attribute.label }}</label>
              <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
              <TextInput v-on:recipient:input:updated="updateRecipientAccountNumberConfirmation" :id="`confirm-input-${attribute.attribute}`" />
              <p v-if="errors[`confirm_${attribute.attribute}`]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[`confirm_${attribute.attribute}`][0] }}</p>
            </div>
          </div>
        </AccountNumberInput>
      </template>
      <template v-else>
        <template v-if="(componentMap[attribute.type] || componentMap['default']) === MobileNumberInput || (componentMap[attribute.type] || componentMap['default']) === PhoneNumberInput">
          <label :for="attribute.attribute" :class="[errors[`${attribute.attribute}.country`]?.length > 0 || errors[`${attribute.attribute}.number`]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">{{ attribute.label }}</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
          <component v-on:recipient:input:updated="updateRecipientInput" :is="componentMap[attribute.type] || componentMap['default']" v-bind:attribute="attribute" :id="attribute.attribute" />
          <p v-if="errors[`${attribute.attribute}.country`]?.length > 0 || errors[`${attribute.attribute}.number`]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[`${attribute.attribute}.country`][0] || errors[`${attribute.attribute}.number`][0] }}</p>
        </template>
        <template v-else>
          <label :for="attribute.attribute" :class="[errors[attribute.attribute]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">{{ attribute.label }}</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
          <component v-on:recipient:input:updated="updateRecipientInput" :is="componentMap[attribute.type] || componentMap['default']" v-bind:attribute="attribute" :id="attribute.attribute" />
          <p v-if="errors[attribute.attribute]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[attribute.attribute][0] }}</p>
        </template>
      </template>
    </div>
    <div>
      <label for="relationship" :class="[errors?.relationship_id?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Relation</label>
      <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please select your relation with the recipient.</p>
      <RelationshipInput v-bind:relationships="relationships" v-on:recipient:relationship:updated="updateRelationship" />
      <p v-if="errors?.relationship_id?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors.relationship_id[0] }}</p>
    </div>
    <button v-if="! submitControlOutsourced" :class="{'opacity-60' : isSaving}" :disabled="isSaving" type="submit" class="block w-full bg-brand-700 text-white text-center py-2.5 rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer text-sm">
      <span v-if="isSaving" class="flex justify-center items-center">
        <Spinner :class="'w-5 h-5 mr-3'"/>
        <span>Saving...</span>
      </span>
      <span v-else>Save Recipient</span>
    </button>
  </form>
</template>