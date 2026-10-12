<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import LoadFailurePanel from "@/components/LoadFailurePanel.vue";
import CustomerLayout from "@/components/CustomerLayout.vue";
import {computed, onMounted, ref, watch} from "vue";
import {ArrowLongLeftIcon} from "@heroicons/vue/20/solid/index.js";
import {BanknotesIcon} from "@heroicons/vue/24/outline/index.js";
import ListShimmer from "@/components/Transaction/ListShimmer.vue";
import Pagination from "@/components/Pagination.vue";
import MovementListItem from "@/components/Wallet/MovementListItem.vue";
import WalletMovement from "@/models/wallet_movement.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";
import {useTimeUtils} from "@/composables/time_utils.js";
import {useWalletStore} from "@/stores/wallet.js";

const walletUtils = useWalletUtils();
const timeUtils = useTimeUtils();
const walletStore = useWalletStore();

const data = ref(null);
const isLoading = ref(true);
const loadFailure = ref(null);

async function getMovements(page = 1) {
  isLoading.value = true;
  loadFailure.value = null;
  await walletUtils.getMovements(page).then((response) => {
    data.value = response.data;
  }).catch((e) => {
    logRequestFailure(e, 'wallet-statement');
    loadFailure.value = failureMessage(e, t('wallet.weCouldntLoadYour6'));
  }).finally(() => {
    isLoading.value = false;
  });
}

onMounted(async () => {
  getMovements();
});

async function refreshMovements() {
  await walletUtils.getMovements(data.value?.pagination?.current_page ?? 1).then((response) => {
    data.value = response.data;
  }).catch(() => {});
}

// CustomerLayout refetches the wallet when WalletBalanceChanged arrives —
// a replaced balance object means a new movement is on the books.
watch(() => walletStore.wallet.data, () => {
  if (! isLoading.value) {
    refreshMovements();
  }
});

const movements = computed(() => {
  return data.value?.data.map((data) => {
    const movement = WalletMovement.getInstance(data);
    return {
      data: movement,
      niceTime: timeUtils.getNiceTime(movement.postedAt),
    }
  });
});
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
        <h1 class="sr-only">{{ $t('wallet.walletStatement') }}</h1>
        <div class="rounded-lg border border-gray-100 bg-white px-4 py-4 sm:px-6">
          <router-link :to="{name: 'wallet'}" class="inline-flex items-center gap-x-1.5 text-sm/6 font-medium text-gray-500 hover:text-gray-700">
            <ArrowLongLeftIcon class="size-5" aria-hidden="true" />{{ $t('wallet.backToWallet') }}</router-link>
          <h2 class="mt-2 text-base font-semibold text-gray-900">{{ $t('wallet.walletStatement2') }}</h2>
          <p class="mt-0.5 text-sm/6 text-gray-500">{{ $t('wallet.everyMovementOnYourWallet') }}</p>
        </div>

        <template v-if="isLoading">
          <div class="grid grid-cols-1 gap-4 rounded-t-lg bg-white border border-solid border-gray-100">
            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <ListShimmer />
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <template v-if="movements?.length > 0">
            <div class="flex-col">
              <div class="grid grid-cols-1 gap-4 rounded-t-lg bg-white border border-solid border-gray-100">
                <ul role="list" class="divide-y divide-gray-100">
                  <li v-for="movement in movements" :key="movement.data.id" class="flex justify-between gap-x-6 py-5 px-6 sm:px-8">
                    <MovementListItem v-bind:movement="movement.data" v-bind:niceTime="movement.niceTime" />
                  </li>
                </ul>
              </div>
              <div v-if="data.pagination" class="-mb-4">
                <Pagination v-bind:pagination="data.pagination" v-on:pageClicked="getMovements" />
              </div>
            </div>
          </template>
          <template v-else-if="loadFailure">
            <LoadFailurePanel :title="$t('wallet.weCouldntLoadYourWallet2')" :message="loadFailure" :retryLabel="$t('common.tryAgain')" @retry="getMovements()" class="mt-0" />
          </template>
          <template v-else>
            <div class="relative flex flex-col items-center justify-center w-full h-full rounded-lg border border-gray-300 p-12 text-center bg-white shadow-lg">
              <div>
                <BanknotesIcon class="mx-auto size-12 text-gray-400" aria-hidden="true" />
                <span class="mt-4 block text-lg font-semibold text-gray-900">{{ $t('wallet.noMovementsYet') }}</span>
                <p class="mt-2 text-sm/6 text-gray-600 max-w-sm">{{ $t('wallet.addMoneyToYourWallet2') }}</p>
              </div>
            </div>
          </template>
        </template>
      </div>
    </main>
  </CustomerLayout>
</template>
