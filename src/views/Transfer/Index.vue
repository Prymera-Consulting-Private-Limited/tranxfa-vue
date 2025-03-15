<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {onMounted, reactive, ref} from "vue";
import {useQuoteUtils} from "@/composables/quote_utils.js";
import {useMachine} from "@xstate/vue";
import {transactionNavigationMachine} from "@/machines/transaction_navigation_machine.js";
import RecipientListing from "@/components/Transaction/RecipientListing.vue";
import TransactionQuote from "@/models/transaction_quote.js";
import Confirm from "@/components/Transaction/Confirm.vue";
const { snapshot, send } = useMachine(transactionNavigationMachine);
const props = defineProps({
  id: {
    type: String,
    required: true
  },
});

const quoteUtils = useQuoteUtils();
const quote = reactive({
  data: null
});

const isLoading = ref(true);

onMounted(async () => {
  if (! quote.data) {
    await quoteUtils.getTransferQuote(props.id).then((response) => {
      quote.data = TransactionQuote.getInstance(response.data);
      send({ type: 'UPDATE_QUOTE', data: quote.data });
    }).finally(() => {
      isLoading.value = false;
    });
  } else {
    isLoading.value = false;
  }
});

async function setRecipient(recipient) {
  await quoteUtils.setRecipient(props.id, recipient).then((response) => {
    quote.data = TransactionQuote.getInstance(response.data);
    send({ type: 'SELECT_EXISTING_RECIPIENT', recipient });
  });
}
</script>

<template>
  <CustomerLayout>
    <template v-if="isLoading">

    </template>
    <template v-else>
      <RecipientListing v-on:recipientClicked="setRecipient" v-if="snapshot.value === 'selectRecipient'" v-bind:quote="quote.data" />
      <Confirm v-else-if="snapshot.value === 'confirm'" v-bind:quote="quote.data" />
    </template>

  </CustomerLayout>
</template>