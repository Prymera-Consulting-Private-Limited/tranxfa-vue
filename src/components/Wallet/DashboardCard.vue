<script setup>
import {onMounted, watch} from "vue";
import {WalletIcon} from "@heroicons/vue/24/outline/index.js";
import {useWalletStore} from "@/stores/wallet.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";

const walletStore = useWalletStore();
const walletUtils = useWalletUtils();

function fetchBalances() {
  walletUtils.getWallet().catch(() => {});
}

onMounted(() => {
  if (walletStore.isEnrolled) {
    fetchBalances();
  }
});

watch(() => walletStore.isEnrolled, (enrolled) => {
  if (enrolled) {
    fetchBalances();
  }
});
</script>

<template>
  <div v-if="walletStore.isEnrolled" class="rounded-lg bg-white shadow-lg p-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-x-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50">
          <WalletIcon class="size-5 text-brand-700" aria-hidden="true" />
        </div>
        <div>
          <p class="text-xs font-medium text-gray-500">Wallet balance</p>
          <template v-if="walletStore.wallet.data?.balances?.length > 0">
            <p v-for="balance in walletStore.wallet.data.balances" :key="balance.currency" class="text-lg font-bold tracking-tight text-gray-900">{{ balance.amountFormatted }}</p>
          </template>
          <p v-else class="text-lg font-bold tracking-tight text-gray-900">&mdash;</p>
        </div>
      </div>
      <router-link :to="{name: 'wallet'}" class="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-500">Manage &rarr;</router-link>
    </div>
  </div>
</template>
