<script setup>
import {ArrowDownLeftIcon, ArrowUpRightIcon} from "@heroicons/vue/24/outline/index.js";
import WalletMovement from "@/models/wallet_movement.js";

defineProps({
  movement: {
    type: Object(WalletMovement),
    required: true,
  },
  niceTime: {
    type: String,
    required: false,
    default: '',
  },
});
</script>

<template>
  <div class="flex min-w-0 gap-x-4">
    <div :class="[movement.isCredit() ? 'bg-green-100' : 'bg-gray-100', 'flex size-10 shrink-0 items-center justify-center rounded-full']">
      <ArrowDownLeftIcon v-if="movement.isCredit()" class="size-5 text-green-600" aria-hidden="true" />
      <ArrowUpRightIcon v-else class="size-5 text-gray-500" aria-hidden="true" />
    </div>
    <div class="min-w-0 flex-auto">
      <p class="text-sm font-medium text-gray-900">{{ movement.description }}</p>
      <p class="mt-1 truncate text-xs text-gray-500">
        <template v-if="movement.memo">{{ movement.memo }} &middot; </template>{{ niceTime }}
      </p>
    </div>
  </div>
  <div class="flex shrink-0 items-center">
    <p :class="[movement.isCredit() ? 'text-green-600' : 'text-gray-900', 'text-sm font-semibold']">{{ movement.amountFormatted }}</p>
  </div>
</template>
