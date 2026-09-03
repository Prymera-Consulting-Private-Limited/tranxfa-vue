<script setup>
import {computed} from "vue";
import {
  ArrowDownLeftIcon,
  ArrowsUpDownIcon,
  ArrowUpRightIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from "@heroicons/vue/24/outline/index.js";
import WalletMovement from "@/models/wallet_movement.js";
import WalletMovementKind from "@/enums/wallet_movement_kind.js";

const props = defineProps({
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

const kindIcon = computed(() => {
  switch (props.movement.kind) {
    case WalletMovementKind.LOAD:
      return ArrowDownLeftIcon;
    case WalletMovementKind.REFUND:
      return ArrowUturnLeftIcon;
    case WalletMovementKind.SPEND:
      return ArrowUpRightIcon;
    case WalletMovementKind.RETURN:
      return ArrowUturnRightIcon;
    case WalletMovementKind.ADJUSTMENT:
      return ArrowsUpDownIcon;
    default:
      return props.movement.isCredit() ? ArrowDownLeftIcon : ArrowUpRightIcon;
  }
});

// Adjustments swing either way, and an unknown future kind must not break the
// row — both fall back to the amount's sign.
const isInflow = computed(() => {
  switch (props.movement.kind) {
    case WalletMovementKind.LOAD:
    case WalletMovementKind.REFUND:
      return true;
    case WalletMovementKind.SPEND:
    case WalletMovementKind.RETURN:
      return false;
    default:
      return props.movement.isCredit();
  }
});
</script>

<template>
  <div class="flex min-w-0 gap-x-4">
    <div :class="[isInflow ? 'bg-green-100' : 'bg-gray-100', 'flex size-10 shrink-0 items-center justify-center rounded-full']">
      <component :is="kindIcon" :class="[isInflow ? 'text-green-600' : 'text-gray-500']" class="size-5" aria-hidden="true" />
    </div>
    <div class="min-w-0 flex-auto">
      <p class="text-sm font-medium text-gray-900">{{ movement.description }}</p>
      <p class="mt-1 truncate text-xs text-gray-500">{{ niceTime }}</p>
    </div>
  </div>
  <div class="flex shrink-0 items-center">
    <p :class="[movement.isCredit() ? 'text-green-600' : 'text-gray-900', 'text-sm font-semibold']">{{ movement.amountFormatted }}</p>
  </div>
</template>
