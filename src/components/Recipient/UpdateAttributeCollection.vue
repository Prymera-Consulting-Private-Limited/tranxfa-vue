<script setup>
import TextInput from "@/components/Recipient/Attribute/TextInput.vue";
import DeliveryOptionInput from "@/components/Recipient/Attribute/DeliveryOptionInput.vue";
import MobileNumberInput from "@/components/Recipient/Attribute/MobileNumberInput.vue";
import EmailInput from "@/components/Recipient/Attribute/EmailInput.vue";
import AccountNumberInput from "@/components/Recipient/Attribute/AccountNumberInput.vue";
import PhoneNumberInput from "@/components/Recipient/Attribute/PhoneNumberInput.vue";
import {computed, onMounted, reactive, ref, watchEffect} from "vue";
import RecipientDataType from "@/enums/recipient_data_type.js";
import Relationship from "@/models/relationship.js";
import RelationshipInput from "@/components/Recipient/Attribute/RelationshipInput.vue";
import Spinner from "@/components/Spinner.vue";
import {useRecipientUtils} from "@/composables/recipient_utils.js";
import Recipient from "@/models/recipient.js";
import NameInput from "@/components/Recipient/Attribute/NameInput.vue";
import SecondNameInput from "@/components/Recipient/Attribute/SecondNameInput.vue";
import ThirdNameInput from "@/components/Recipient/Attribute/ThirdNameInput.vue";
import {useResourceUtils} from "@/composables/resource_utils.js";
import SelectInput from "@/components/Recipient/Attribute/SelectInput.vue";

const props = defineProps({
  recipient: {
    type: Object(Recipient),
    required: true,
  }
})

const relationships = ref([]);

const errors = reactive({
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
    'relationship_id': props.recipient.relationship.id,
  },
});

const confirmAccountNumberInput = ref(null);

for (const attribute of props.recipient.attributes) {
  if (attribute.type === RecipientDataType.MOBILE_NUMBER) {
    errors[`${attribute.attribute}.number`] = [];
    errors[`${attribute.attribute}.country`] = [];
    input.data[attribute.attribute] = {
      country: attribute.value?.country?.id,
      number: attribute.value?.number,
    };
  } else if (attribute.type === RecipientDataType.PHONE_NUMBER) {
    errors[`${attribute.attribute}.number`] = [];
    errors[`${attribute.attribute}.country`] = [];
    input.data[attribute.attribute] = {
      country: attribute.value?.country?.id,
      number: attribute.value?.number,
    };
  } else if (attribute.type === RecipientDataType.DELIVERY_OPTION) {
    input.data[attribute.attribute] = attribute.value?.id;
  } else if (attribute.type === RecipientDataType.SELECT) {
    input.data[attribute.attribute] = attribute.value?.id;
  } else {
    input.data[attribute.attribute] = attribute.value;
    errors[attribute.attribute] = [];
  }
  if (attribute.type === RecipientDataType.ACCOUNT_NUMBER) {
    if (props.recipient.channel.configuration.confirmAccountNumber) {
      confirmAccountNumberInput.value = attribute.value;
      input.data[`confirm_${attribute.attribute}`] = confirmAccountNumberInput;
      errors[`confirm_${attribute.attribute}`] = [];
    }
  }
}

async function updateRecipientAccountNumberConfirmation(updated) {
  confirmAccountNumberInput.value = updated;
}
async function updateRelationship(relationship) {
  input.data.relationship_id = relationship.id;
}

const nameLookup = computed(() => {
  if (props.recipient.channel.configuration?.nameLookupRequirements?.length > 0) {
    return {
      attributes: props.recipient.channel.configuration.nameLookupRequirements.map((attribute => {
        return {
          attribute: attribute,
          isValid: input.data[attribute] !== null && input.data[attribute] !== undefined && input.data[attribute].length > 0
        }
      })),
      isValid: props.recipient.channel.configuration.nameLookupRequirements.every((attribute) => {
        if (input.data[attribute] === null || input.data[attribute] === undefined) {
          return false;
        }
        const lookupAttribute = props.recipient.attributes.find((recipientAttribute) => {
          return recipientAttribute.attribute === attribute;
        });
        if (lookupAttribute?.minLength && input.data[attribute].length < lookupAttribute.minLength) {
          return false;
        }
        if (lookupAttribute?.maxLength && input.data[attribute].length > lookupAttribute.maxLength) {
          return false;
        }
        if (lookupAttribute?.exactLength && input.data[attribute].length !== lookupAttribute.exactLength) {
          return false;
        }
        if(lookupAttribute.regexPattern && !new RegExp(lookupAttribute.regexPattern).test(input.data[attribute])) {
          return false;
        }

        return input.data[attribute].length > 0;
      }),
    };
  }
  return [];
});

async function updateRecipientInput(updated, attribute) {
  if (attribute.type === RecipientDataType.DELIVERY_OPTION) {
    input.data[attribute.attribute] = updated.id;
  } else {
    input.data[attribute.attribute] = updated;
  }
}

const isSaving = ref(false);

const isLoading = ref(false);

const recipientUtils = useRecipientUtils();

const resourceUtils = useResourceUtils();

const emit = defineEmits([
    'recipient:updated',
    'recipient:update:failed',
]);

async function updateRecipient() {
  isSaving.value = true;
  Object.entries(errors).forEach(([key]) => {
    errors[key] = [];
  });

  await recipientUtils.update(props.recipient.id, input.data).then((response) => {
    const recipient = Recipient.getInstance(response.data);
    emit('recipient:updated', recipient);
  }).catch((e) => {
    if (e.status === 422) {
      for (const [key, value] of Object.entries(e.response.data.errors)) {
        errors[key] = value;
      }
    } else {
      console.error(e)
      isSaving.value = false;
      throw e;
    }
    emit('recipient:update:failed');
  }).finally(() => {
    isSaving.value = false;
  });
}

const isLookingUp = ref(false);

const doLookup = () => {
  if (nameLookup.value.isValid) {
    isLookingUp.value = true;
    const query = {};
    const nameAttribute = props.recipient.attributes.find((attribute) => {
      return attribute.type === RecipientDataType.NAME;
    });
    errors[nameAttribute.attribute] = [];
    input.data[nameAttribute.attribute] = null;
    for (const attribute of nameLookup.value.attributes) {
      query[attribute.attribute] = input.data[attribute.attribute];
    }
    recipientUtils.lookup(props.recipient.channel, query).then((response) => {
      input.data[nameAttribute.attribute] = response.data.name;
    }).catch((e) => {
      input.data[nameAttribute.attribute] = null;
      errors[nameAttribute.attribute] = [e.response.data.message];
    }).finally(() => {
      isLookingUp.value = false;
    });
  }
}

onMounted(async () => {
  isLoading.value = true;
  await resourceUtils.relationships().then((response) => {
    relationships.value = response.data.data.map((relationship) => Relationship.getInstance(relationship))
  }).finally(() => {
    isLoading.value = false;
  });
})

watchEffect(() => {
  if (nameLookup.value.isValid) {
    doLookup();
  }
});
</script>

<template>
  <div v-if="isLoading" role="status" class="p-10 flex items-center justify-center w-64 lg:min-w-96 mx-auto min-h-96">
    <Spinner class="size-16 mx-auto" />
    <button class="sr-only">Loading...</button>
  </div>
  <form v-else @submit.prevent="updateRecipient" class="space-y-6 sm:min-w-md">
    <div v-for="attribute in recipient.attributes" :key="attribute.id">
      <template v-if="(componentMap[attribute.type] || componentMap['default']) === AccountNumberInput">
        <AccountNumberInput v-bind:attribute="attribute" :id="attribute.attribute">
          <div class="space-y-6">
            <div>
              <label :for="attribute.attribute" :class="[errors[attribute.attribute]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">
                {{ attribute.label }}
                <span v-if="attribute.isRequired === true" class="ml-0.5 text-red-500">*</span>
              </label>
              <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
              <TextInput
                  v-bind:defaultValue="input.data[attribute.attribute]"
                  v-on:recipient:input:updated="updateRecipientInput"
                  v-bind:attribute="attribute"
                  :id="attribute.attribute"
              />
              <p v-if="errors[attribute.attribute]?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors[attribute.attribute][0] }}</p>
            </div>
            <div v-if="props.recipient.channel.configuration.confirmAccountNumber">
              <label :for="`confirm-input-${attribute.attribute}`" :class="[errors[`confirm_${attribute.attribute}`]?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">
                Confirm {{ attribute.label }}
                <span v-if="attribute.isRequired === true" class="ml-0.5 text-red-500">*</span>
              </label>
              <p class="mb-2 mt-1 text-xs text-gray-500 tracking-wider">{{ attribute.helpText }}</p>
              <TextInput
                  v-bind:defaultValue="input.data[attribute.attribute]"
                  v-on:recipient:input:updated="updateRecipientAccountNumberConfirmation"
                  v-bind:attribute="attribute"
                  :id="`confirm-input-${attribute.attribute}`"
              />
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
              v-bind:country="props.recipient.channel.country"
              v-bind:defaultValue="input.data[attribute.attribute]"
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
              v-bind:disableNameInput="recipient.channel.configuration?.nameLookupRequirements?.length > 0"
              v-bind:isLookingUp="isLookingUp"
              v-bind:defaultValue="input.data[attribute.attribute]"
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
      <RelationshipInput v-bind:defaultValue="recipient.relationship" v-bind:relationships="relationships" v-on:recipient:relationship:updated="updateRelationship" />
      <p v-if="errors?.relationship_id?.length > 0" class="mt-2 mb-3 text-red-500 text-sm">{{ errors.relationship_id[0] }}</p>
    </div>
    <button :class="{'opacity-60' : isSaving}" :disabled="isSaving" type="submit" class="block w-full bg-brand-700 text-white text-center py-2.5 rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer text-sm">
      <span v-if="isSaving" class="flex justify-center items-center">
        <Spinner :class="'w-5 h-5 mr-3'"/>
        <span>Saving...</span>
      </span>
      <span v-else>Save Changes</span>
    </button>
  </form>
</template>