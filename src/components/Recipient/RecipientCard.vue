<script setup>
import Recipient from "@/models/recipient.js";
import FlagIcon from "vue3-flag-icons";

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
      <template v-if="recipient?.channel?.country">
        <dt class="sr-only">In Country</dt>
        <dd class="text-gray-500 text-sm leading-5 flex items-center mx-auto gap-x-2">
          <FlagIcon :code="recipient.channel.country.iso2Alpha.toLowerCase()" circle  />
          {{ recipient.channel.country.commonName }}
        </dd>
      </template>
      <template v-if="recipient?.channel?.payoutMethod">
        <dt class="sr-only">Payout Method</dt>
        <dd class="mt-3">
          <span class="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">{{ recipient.channel.payoutMethod.title }}</span>
        </dd>
      </template>
      <slot />
    </dl>
  </div>
</template>