<script setup>
import Recipient from "@/models/recipient.js";
import FlagIcon from "vue3-flag-icons";
import {useTimeUtils} from "@/composables/time_utils.js";
import {onMounted, ref} from "vue";

const props = defineProps({
  recipient: {
    type: Recipient,
    required: true,
  },
  cardColor: {
    type: String,
    required: true,
  }
})

const timeUtils = useTimeUtils();

const lastSentOn = ref(null)

const updateTimestamp = () => {
  lastSentOn.value = props.recipient.transactionSummary?.recentTransactionAt ? timeUtils.getNiceTime(props.recipient.transactionSummary.recentTransactionAt) : null;
}

let intervalId;

onMounted(() => {
  updateTimestamp();
  intervalId = setInterval(updateTimestamp, 30000);
})
</script>

<template>
  <div class="flex flex-1 flex-col px-4 py-5">
    <div :class="[`bg-${cardColor}-500`]" class="flex items-center justify-center mx-auto size-10 shrink-0 rounded-full text-white tracking-wider text-sm">
      {{ recipient.firstName.charAt(0) + recipient.lastName.charAt(0) }}
    </div>
    <h3 class="mt-6 text-sm font-medium text-gray-900 break-words">{{ recipient.fullName }}</h3>
    <dl class="mt-1 flex grow flex-col justify-between">
      <template v-if="recipient?.channel?.country">
        <dt class="sr-only">In Country</dt>
        <dd class="text-gray-500 text-sm leading-5 flex items-center mx-auto gap-x-2 truncate">
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
      <template v-if="lastSentOn">
        <dt class="sr-only">Last transaction sent on</dt>
        <dd class="text-gray-500 text-xs leading-4 flex-col items-center mx-auto gap-x-2 mt-2">
          <p>Last transaction</p>
          <p class="text-purple-700">{{ lastSentOn }}</p>
        </dd>
      </template>
      <template v-else>
        <dt class="sr-only">You've never sent money to {{ recipient.fullName }}</dt>
        <dd class="text-gray-400 text-xs leading-4 flex-col items-center mx-auto gap-x-2 mt-2">
          <p>You've never sent money to</p>
          <p>{{ recipient.fullName }}</p>
        </dd>
      </template>
    </dl>
  </div>
</template>