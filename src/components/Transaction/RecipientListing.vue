<script setup>
import RecipientCard from "@/components/Recipient/RecipientCard.vue";
import Calculator from "@/components/Calculator.vue";
import TransactionQuote from "@/models/transaction_quote.js";

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

const emit = defineEmits(["recipientClicked"]);

const recipientClicked = (recipient) => {
  emit("recipientClicked", recipient);
}
</script>

<template>
  <main class="-mt-24 py-8">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
      <h1 class="sr-only">Your Recipients</h1>
      <!-- Main 3 column grid -->
      <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 bg-white rounded-t-lg p-5">
        <!-- Left column -->
        <div class="grid grid-cols-1 gap-4 lg:col-span-2">
          <section aria-labelledby="section-2-title">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-base font-semibold text-gray-900">Your recipient for receiving {{ quote.foreignAmountCurrencyPrefixed }}</h2>
                <p class="mt-1 text-sm text-gray-500">Choose from your existing recipients or create a new recipient for receiving {{ quote.payoutCurrency.code }} in {{ quote.payoutCountry.commonName }}  via {{ quote.payoutMethod.title }}.</p>
              </div>
            </div>
            <template v-if="quote.recipients.length > 0" >
              <ul role="list" class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 border-t border-gray-200 py-6">
                <li v-for="(recipient, index) in quote.recipients" :key="recipient.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center transition-transform transform hover:scale-105 shadow-sm hover:shadow-md">
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
          </section>
        </div>

        <!-- Right column -->
        <div class="grid grid-cols-1 gap-4">
          <section aria-labelledby="section-2-title">
            <h2 class="sr-only" id="section-2-title">Transaction Summary</h2>
            <div class="rounded-lg bg-white shadow-lg p-5 pb-16">
              <Calculator />
            </div>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>