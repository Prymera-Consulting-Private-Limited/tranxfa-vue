<script setup>
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import InlineFailure from "@/components/InlineFailure.vue";
import TargetSelection from "@/components/Recipient/TargetSelection.vue";
import {onMounted, reactive, ref, watch, watchEffect} from "vue";
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
import QuoteTarget from "@/models/quote_target.js";
import PayoutMethod from "@/models/payout_method.js";

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

// Each step fetches what the next one needs. A rejected fetch used to leave
// the spinner up for good; now the step stays put with a message and a
// "Try again" that repeats the same fetch.
const loadFailure = ref(null);
let retryLast = () => {};

function retry() {
  loadFailure.value = null;
  retryLast();
}

async function fetchPayoutMethods() {
  isLoading.value = true;
  retryLast = fetchPayoutMethods;
  try {
    const response = await payoutChannelUtils.getMethods({
      country: recipient.country,
      currency: recipient.currency,
    });
    payoutMethods.value = response.data.data.map((o) => PayoutMethod.getInstance(o));
  } catch (e) {
    logRequestFailure(e, 'recipient-payout-methods');
    loadFailure.value = failureMessage(e, "We couldn't load the ways to send money to this country.");
    isLoading.value = false;
    return;
  }
  if (payoutMethods.value.length === 1) {
    await updatePayoutMethod(payoutMethods.value[0]);
  } else {
    isLoading.value = false;
  }
}

async function updateRecipientTarget(target) {
  recipient.country = target.country;
  recipient.currency = target.currency;
  send({
    type: "SET_CONTEXT",
    target: target
  });
  send({ type: "PROCEED" })
  await fetchPayoutMethods();
}

async function fetchPayoutChannel() {
  isLoading.value = true;
  retryLast = fetchPayoutChannel;
  try {
    recipient.payoutChannel = await payoutChannelUtils.getChannel({
      payoutMethod: recipient.payoutMethod,
      country: recipient.country,
      currency: recipient.currency,
    });
  } catch (e) {
    logRequestFailure(e, 'recipient-payout-channel');
    loadFailure.value = failureMessage(e, "We couldn't load the details this delivery method needs.");
    isLoading.value = false;
    return;
  }
  if (recipient.payoutChannel.configuration.recipientType === RecipientType.INDIVIDUAL) {
    await updateRecipientType(RecipientType.INDIVIDUAL);
  } else if (recipient.payoutChannel.configuration.recipientType === RecipientType.BUSINESS) {
    await updateRecipientType(RecipientType.BUSINESS);
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
  await fetchPayoutChannel();
}

async function fetchRelationships() {
  isLoading.value = true;
  retryLast = fetchRelationships;
  await resourceUtils.relationships(recipient.country?.id ?? null).then((response) => {
    relationships.value = response.data.data.map((relationship) => Relationship.getInstance(relationship))
  }).catch((e) => {
    logRequestFailure(e, 'recipient-relationships');
    loadFailure.value = failureMessage(e, "We couldn't load the list of relationships, and a recipient needs one.");
  }).finally(() => {
    isLoading.value = false;
  });
}

async function updateRecipientType(type) {
  recipient.type = type;
  send({
    type: "SET_CONTEXT",
    recipientType: type
  });
  send({ type: "PROCEED" })
  await fetchRelationships();
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
    retryLast = () => window.location.reload();
    await payoutChannelUtils.getTargets().then((response) => {
      targets.value = response.data.data.map((data) => QuoteTarget.getInstance(data));
    }).catch((e) => {
      logRequestFailure(e, 'recipient-targets');
      loadFailure.value = failureMessage(e, "We couldn't load the countries you can send to.");
    });
    if (targets.value.length === 1) {
      await updateRecipientTarget(targets.value[0]);
    } else {
      isLoading.value = false;
    }
  }
})

const emit = defineEmits([
    'recipient:added',
    'recipient:add:failed',
    'recipient:add:loadingStateUpdated',
]);

const recipientAdded = (recipient) => {
  emit('recipient:added', recipient);
}

const saveRecipientFailed = (error) => {
  emit('recipient:add:failed', error);
}

const isChildComponentLoading = ref(false);

watchEffect(() => {
  emit('recipient:add:loadingStateUpdated', isLoading.value || isChildComponentLoading.value || false);
})

function updateChildComponentLoadingState(newState) {
  isChildComponentLoading.value = newState;
}

</script>

<template>
  <div>
    <div v-if="isLoading" role="status" class="p-10 flex items-center justify-center w-64 lg:min-w-96 mx-auto min-h-96">
      <Spinner class="size-16 mx-auto" />
      <span class="sr-only">Loading...</span>
    </div>
    <InlineFailure v-else-if="loadFailure" :message="loadFailure" retryLabel="Try again" @retry="retry" class="mt-0 mb-4" />
    <template v-else>
      <template v-if="snapshot?.value === 'addRecipientForm'">
        <h4 class="text-base text-gray-800 font-semibold">Recipient Details</h4>
        <p class="mt-1 text-sm/6 text-gray-700 mb-5">For receiving <span class="text-brand-700 font-semibold">{{ recipient.currency?.isoAlpha }}</span> in <span class="text-brand-700 font-semibold">{{ recipient.country?.commonName }}</span> using <span class="text-brand-700 font-semibold">{{ recipient.payoutMethod?.title }}</span></p>
        <AttributeCollection
            v-bind:country="recipient.country"
            v-bind:currency="recipient.currency"
            v-bind:payoutMethod="recipient.payoutMethod"
            v-bind:payoutChannel="recipient.payoutChannel"
            v-bind:type="recipient.type"
            v-bind:relationships="relationships"
            v-bind:isSubmitted="externalSaveTrigger"
            v-bind:quote="props.quote"
            v-on:recipient:added="recipientAdded"
            v-on:recipient:add:failed="saveRecipientFailed"
            v-on:recipient:add:loadingStateUpdated="updateChildComponentLoadingState"
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
    </template>
  </div>
</template>