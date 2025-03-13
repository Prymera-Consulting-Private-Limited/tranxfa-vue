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
import {reactive, ref} from "vue";
import RecipientDataType from "@/enums/recipient_data_type.js";
import Relationship from "@/models/relationship.js";
import RelationshipInput from "@/components/Recipient/Attribute/RelationshipInput.vue";

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
  errors: Object,
  relationships: {
    type: Array({type: Relationship}),
    required: true,
  },
})

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
  if (attribute.type === RecipientDataType.ACCOUNT_NUMBER) {
    input.data[attribute.attribute] = null;
    input.data[`confirm_${attribute.attribute}`] = confirmAccountNumberInput;
  } else {
    input.data[attribute.attribute] = null;
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

</script>

<template>
  <form class="space-y-6 mt-12">
    <div v-if="type === RecipientType.BUSINESS">
      <div >
        <div>
          <label for="entity-name" :class="[false ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Entity Name</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please enter the entity name as it appears of their incorporation certificate or similar documents.</p>
          <EntityNameInput v-on:recipient:input:updated="updateRecipientEntityName" :id="`entity-name`" />
          <p class="mt-2 mb-3 text-gray-400 text-sm"></p>
        </div>
      </div>
    </div>
    <div v-else>
      <div :class="[
          payoutChannel.configuration.askForMiddleName ? 'lg:grid-cols-3' :  'lg:grid-cols-2'
      ]" class="grid grid-cols-1 gap-6">
        <div>
          <label for="first-name" :class="[false ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">First Name</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please enter the first name of the recipient as it appears of their identity document.</p>
          <FirstNameInput v-on:recipient:input:updated="updateRecipientFirstName" :id="`first-name`" />
          <p class="mt-2 mb-3 text-gray-400 text-sm"></p>
        </div>
        <div v-if="payoutChannel.configuration.askForMiddleName">
          <label for="middle-name" :class="[false ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Middle Name</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please enter the middle name of the recipient as it appears of their identity document.</p>
          <MiddleNameInput v-on:recipient:input:updated="updateRecipientMiddleName" :id="`middle-name`" />
          <p class="mt-2 mb-3 text-gray-400 text-sm"></p>
        </div>
        <div>
          <label for="last-name" :class="[false ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Last Name</label>
          <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please enter the last name of the recipient as it appears of their identity document.</p>
          <LastNameInput v-on:recipient:input:updated="updateRecipientLastName" :id="`last-name`" />
          <p class="mt-2 mb-3 text-gray-400 text-sm"></p>
        </div>
      </div>
    </div>

    <div v-for="attribute in payoutChannel.attributes" :key="attribute.id">
      <template v-if="(componentMap[attribute.type] || componentMap['default']) === AccountNumberInput">
        <AccountNumberInput v-bind:attribute="attribute" :id="attribute.attribute">
          <div class="space-y-6">
            <div>
              <label :for="attribute.attribute" :class="[false ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">{{ attribute.label }}</label>
              <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
              <TextInput v-on:recipient:input:updated="updateRecipientInput" v-bind:attribute="attribute" :id="attribute.attribute" />
            </div>
            <div>
              <label :for="`confirm-input-${attribute.attribute}`" :class="[false ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Confirm {{ attribute.label }}</label>
              <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
              <TextInput v-on:recipient:input:updated="updateRecipientAccountNumberConfirmation" :id="`confirm-input-${attribute.attribute}`" />
            </div>
          </div>
        </AccountNumberInput>
      </template>
      <template v-else>
        <label :for="attribute.attribute" :class="[false ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">{{ attribute.label }}</label>
        <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
        <component v-on:recipient:input:updated="updateRecipientInput" :is="componentMap[attribute.type] || componentMap['default']" v-bind:attribute="attribute" :id="attribute.attribute" />
      </template>
    </div>
    <div>
      <label for="relationship" :class="[false ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Relation</label>
      <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">Please select your relation with the recipient.</p>
      <RelationshipInput v-bind:relationships="relationships" v-on:recipient:relationship:updated="updateRelationship" />
    </div>
    <button type="submit" class="block w-full bg-brand-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">Continue</button>
  </form>
</template>