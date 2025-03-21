<script setup>
import TargetSelection from "@/components/Recipient/TargetSelection.vue";
import {onMounted, reactive, ref} from "vue";
import Spinner from "@/components/Spinner.vue";
import {useQuoteUtils} from "@/composables/quote_utils.js";
import {addRecipientNavigationMachine} from "@/machines/add_recipient_navigation_machine.js";
import {useMachine} from "@xstate/vue";
import RecipientTypeSelection from "@/components/Recipient/RecipientTypeSelection.vue";
import PayoutMethodSelection from "@/components/Recipient/PayoutMethodSelection.vue";
import AttributeCollection from "@/components/Recipient/AttributeCollection.vue";
import {usePayoutChannelUtils} from "@/composables/payout_channel_utils.js";
import RecipientType from "@/enums/recipient_type.js";
import {useResourceUtils} from "@/composables/resource_utils.js";
import Relationship from "@/models/relationship.js";
import TransactionQuote from "@/models/transaction_quote.js";

const isLoading = ref(true);
const quoteUtils = useQuoteUtils();
const payoutChannelUtils = usePayoutChannelUtils();
const resourceUtils = useResourceUtils();
const { snapshot, send } = useMachine(addRecipientNavigationMachine);

const props = defineProps({
  quote: {
    type: Object(TransactionQuote),
    required: false
  },
  externalSaveTrigger: {
    type: Boolean,
    required: false,
    default: false
  }
})

const recipient = reactive({
  country: props.quote?.payoutCountry,
  currency: props.quote?.payoutCurrency,
  payoutMethod: props.quote?.payoutMethod,
  attributes: null,
  type: null,
  payoutChannel: null,
});

const targets = ref([]);
const payoutMethods = ref([]);
const relationships = ref([]);

async function updateRecipientTarget(target) {
  recipient.country = target.country;
  recipient.currency = target.currency;
  send({
    type: "SET_CONTEXT",
    target: target
  });
  send({ type: "PROCEED" })
  isLoading.value = true;
  await quoteUtils.getQuote({
    payoutCountry: recipient.country,
    payoutCurrency: recipient.currency,
  });
  payoutMethods.value = quoteUtils.quote.data.payoutMethods;
  if (payoutMethods.value.length === 1) {
    await updatePayoutMethod(payoutMethods.value[0]);
  } else {
    isLoading.value = false;
  }
}
async function updatePayoutMethod(payoutMethod) {
  recipient.payoutMethod = payoutMethod;
  send({
    type: "SET_CONTEXT",
    payoutMethod: payoutMethod
  });
  send({ type: "PROCEED" })
  isLoading.value = true;
  recipient.payoutChannel = await payoutChannelUtils.getChannel({
    payoutMethod: recipient.payoutMethod,
    country: recipient.country,
    currency: recipient.currency,
  });
  if (recipient.payoutChannel.configuration.recipientType === RecipientType.INDIVIDUAL) {
    await updateRecipientType(RecipientType.INDIVIDUAL);
  } else if (recipient.payoutChannel.configuration.recipientType === RecipientType.BUSINESS) {
    await updateRecipientType(RecipientType.BUSINESS);
  } else {
    isLoading.value = false;
  }
}

async function updateRecipientType(type) {
  recipient.type = type;
  send({
    type: "SET_CONTEXT",
    recipientType: type
  });
  send({ type: "PROCEED" })
  isLoading.value = true;
  await resourceUtils.relationships().then((response) => {
    relationships.value = response.data.data.map((relationship) => Relationship.getInstance(relationship))
  }).finally(() => {
    isLoading.value = false;
  });

}

onMounted(async () => {
  if (props.quote) {
    send({
      type: "SET_CONTEXT",
      target: {
        country: props.quote.payoutCountry,
        currency: props.quote.payoutCurrency
      }
    });
    send({ type: "PROCEED" })
    await updatePayoutMethod(props.quote.payoutMethod);
  } else {
    await quoteUtils.getQuote().then(() => {
      targets.value = quoteUtils.quote.data.targets;
      if (targets.value.length === 1) {
        updateRecipientTarget(targets.value[0]);
      }
      isLoading.value = false;
    });
  }
  isLoading.value = false;
})

const emit = defineEmits([
    'recipient:added',
    'recipient:add:failed',
]);

const recipientAdded = (recipient) => {
  emit('recipient:added', recipient);
}

const saveRecipientFailed = (error) => {
  emit('recipient:add:failed', error);
}
</script>

<template>
  <div>
    <div v-if="isLoading" role="status" class="p-10 flex items-center justify-center min-w-96 mx-auto min-h-96">
      <Spinner class="size-16 mx-auto" />
      <span class="sr-only">Loading...</span>
    </div>
    <template v-else-if="snapshot?.value === 'addRecipientForm'">
      <AttributeCollection
          v-bind:country="recipient.country"
          v-bind:currency="recipient.currency"
          v-bind:payoutMethod="recipient.payoutMethod"
          v-bind:payoutChannel="recipient.payoutChannel"
          v-bind:type="recipient.type"
          v-bind:relationships="relationships"
          v-bind:isSubmitted = "externalSaveTrigger"
          v-bind:quote="props.quote"
          v-on:recipient:added="recipientAdded"
          v-on:recipient:add:failed="saveRecipientFailed"
      />
    </template>
    <template v-else-if="snapshot?.value === 'recipientTypeSelection'">
      <RecipientTypeSelection
          v-on:recipient:typeSelected="updateRecipientType"
          v-bind:country="recipient.country"
          v-bind:currency="recipient.currency"
          v-bind:payoutMethod="recipient.payoutMethod"
          v-bind:payoutChannel="recipient.payoutChannel"
      />
    </template>
    <template v-else-if="snapshot?.value === 'payoutMethodSelection'">
      <PayoutMethodSelection
          v-on:recipient:payoutMethodSelected="updatePayoutMethod"
          v-bind:country="recipient.country"
          v-bind:currency="recipient.currency"
          v-bind:payoutMethods="payoutMethods"
      />
    </template>
    <template v-else>
      <TargetSelection
          v-on:recipient:targetSelected="updateRecipientTarget"
          v-bind:targets="targets"
      />
    </template>
  </div>
</template>