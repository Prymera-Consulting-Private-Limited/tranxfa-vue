<script setup>
import RecipientCard from "@/components/Recipient/RecipientCard.vue";
import Calculator from "@/components/Calculator.vue";
import TransactionQuote from "@/models/transaction_quote.js";
import QuoteDisplay from "@/components/QuoteDisplay.vue";
import AddRecipientCard from "@/components/Recipient/AddRecipientCard.vue";

defineProps({
  quote: {
    type: TransactionQuote,
    required: true,
  }
})

const colors = [
  "pink",
  "indigo",
  "yellow",
  "green",
  "blue",
  "purple",
]

const emit = defineEmits([
    "recipientClicked",
    "createRecipientClicked"
]);

const recipientClicked = (recipient) => {
  emit("recipientClicked", recipient);
}

const createRecipientClicked = () => {
  emit("createRecipientClicked");
}
</script>

<template v-if="quote.recipients.length > 0" >
  <ul role="list" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
    <li @click="createRecipientClicked" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center border border-gray-200 transition-transform transform hover:scale-105 shadow-sm hover:shadow-md cursor-pointer">
      <AddRecipientCard />
    </li>
    <li v-for="(recipient, index) in quote.recipients" :key="recipient.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center border border-gray-200 transition-transform transform hover:scale-105 shadow-sm hover:shadow-md">
      <div @click="recipientClicked(recipient)" class="cursor-pointer">
        <RecipientCard v-bind:cardColor="colors[index%6]" v-bind:recipient="recipient">
          <dd class="text-gray-400 text-sm leading-5">{{ recipient.accountDetail?.institution?.title }}</dd>
          <dd class="text-gray-400 text-sm leading-5 tracking-wider">{{ recipient.accountDetail?.accountNumber }}</dd>
          <dt class="sr-only">Relation</dt>
          <dd class="mt-3">
            <span class="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">{{ recipient.relationship.title }}</span>
          </dd>
        </RecipientCard>
      </div>
    </li>
  </ul>
</template>