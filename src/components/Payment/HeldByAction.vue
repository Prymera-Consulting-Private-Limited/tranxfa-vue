<script setup>
import {computed} from 'vue';
import {useI18n} from 'vue-i18n';
import {useRoute, useRouter} from 'vue-router';
import DepositHolder from '@/models/deposit_holder.js';
import DepositHolderKind from '@/enums/deposit_holder_kind.js';

const {t} = useI18n();

/**
 * One button that takes the customer to whatever is holding their deposit
 * account (SD-1261). The refusal's message already says "pay it or cancel it",
 * which is no use to somebody who cannot find "it": the payment in the way may
 * be a hotel booking, a transfer or a wallet top-up, made days ago.
 *
 * It renders nothing without a holder, for a kind it does not know, and for a
 * screen this deployment does not have - a hotel booking where travel is not
 * licensed has no route to go to. The message stands on its own in each case.
 */
const props = defineProps({
  holder: {
    type: DepositHolder,
    default: null,
  },
});

const route = useRoute();
const router = useRouter();

// Where they were, so that cancelling the other payment can bring them back to
// the one they were making. The account is free the moment it is cancelled.
const returnTo = computed(() => route.fullPath);

const destination = computed(() => {
  switch (props.holder?.kind) {
    case DepositHolderKind.SERVICE_ORDER:
      // Flights have no screens in this app, so only a hotel booking can be opened.
      return props.holder.service === 'FLIGHTS'
          ? null
          : {name: 'travelBooking', params: {id: props.holder.id}, query: {returnTo: returnTo.value}};

    case DepositHolderKind.TRANSFER:
      return {name: 'viewTransaction', params: {transactionId: props.holder.id}};

    case DepositHolderKind.WALLET_TOPUP:
      return {name: 'wallet'};

    default:
      return null;
  }
});

const label = computed(() => {
  switch (props.holder?.kind) {
    case DepositHolderKind.SERVICE_ORDER:
      return t('payment.heldBy.viewYourHotelBooking');

    case DepositHolderKind.TRANSFER:
      return t('payment.heldBy.viewYourTransfer');

    case DepositHolderKind.WALLET_TOPUP:
      return t('payment.heldBy.viewYourWalletTopUp');

    default:
      return null;
  }
});

const isReachable = computed(() => destination.value !== null && router.hasRoute(destination.value.name));
</script>

<template>
  <div v-if="isReachable" class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <RouterLink
        :to="destination"
        class="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-gray-300 bg-white px-4 text-sm/6 font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-0"
    >{{ label }}</RouterLink>
    <span v-if="holder.reference" class="text-xs/5 text-gray-500">{{ holder.reference }}</span>
  </div>
</template>
