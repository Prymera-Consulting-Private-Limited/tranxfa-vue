<script setup>
import Recipient from "@/models/recipient.js";

defineProps({
  recipient: {
    type: Recipient,
    required: true,
  },
  cardColor: {
    type: String,
    required: true,
  }
})
</script>

<template>
  <div class="flex flex-1 flex-col p-8">
    <div :class="[`bg-${cardColor}-500`]" class="flex items-center justify-center mx-auto size-10 shrink-0 rounded-full text-white tracking-wider text-sm">
      {{ recipient.firstName.charAt(0) + recipient.lastName.charAt(0) }}
    </div>
    <h3 class="mt-6 text-sm font-medium text-gray-900">{{ recipient.fullName }}</h3>
    <dl class="mt-1 flex grow flex-col justify-between">
      <dt class="sr-only">Payout Method</dt>
      <dd class="text-gray-500 text-sm">{{ recipient.channel.payoutMethod.title }}</dd>
      <dt class="sr-only">In Country</dt>
      <dd class="text-gray-500 text-sm leading-5">{{ recipient.channel.country.commonName }}</dd>
      <dt class="sr-only">Relation</dt>
      <dd class="mt-3">
        <span class="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">{{ recipient.relationship.title }}</span>
      </dd>
    </dl>
  </div>
</template>