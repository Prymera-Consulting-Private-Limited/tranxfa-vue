<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

import WalletRefusalType from "@/enums/wallet_refusal_type.js";
import CustomerLayout from "@/components/CustomerLayout.vue";
import { UserIcon, HomeIcon, PhoneIcon, LockClosedIcon, DevicePhoneMobileIcon, WalletIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import {Dialog, DialogDescription, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from "@headlessui/vue";
import {computed, onMounted, ref} from "vue";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";
import CustomerAttributeForm from "@/components/Customer/CustomerAttributeForm.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCountriesStore} from "@/stores/countries.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountryUtils} from "@/composables/country_utils.js";
import {useWalletStore} from "@/stores/wallet.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";
import {notify} from 'notiwind';
import ChangePassword from "@/components/ChangePassword.vue";
import router from "@/router/index.js";

const isPersonalDetailsModalOpen = ref(false);
const isAddressModalOpen = ref(false);
const isChangePasswordModalOpen = ref(false);
const isCloseWalletModalOpen = ref(false);

const isLoading = ref(false)
const customerStore = useCustomerStore()
const countriesStore = useCountriesStore();
const countryUtils = useCountryUtils();
const customerUtils = useCustomerUtils()
const walletStore = useWalletStore();
const walletUtils = useWalletUtils();

const isClosingWallet = ref(false);
const closeWalletError = ref('');

const closeWallet = async () => {
  if (isClosingWallet.value) return;
  closeWalletError.value = '';
  isClosingWallet.value = true;
  await walletUtils.closeSubscription().then(() => {
    isCloseWalletModalOpen.value = false;
    notify(
        {
          group: 'customer',
          title: t('account.walletClosed'),
          text: t('account.yourWalletSubscriptionHas'),
          type: 'success',
        },
        -1,
    )
  }).catch((e) => {
    if (e.response?.data?.type === WalletRefusalType.BALANCE_MUST_BE_ZERO) {
      closeWalletError.value = (e.response.data.message ?? t('account.yourWalletStillHolds')) + ' Spend or withdraw the balance first, then close the wallet.';
    } else {
      closeWalletError.value = e.response?.data?.message ?? t('account.somethingWentWrongPlease');
    }
  }).finally(() => {
    isClosingWallet.value = false;
  });
}

onMounted( async () => {
  if (! customerStore.isLoaded) {
    await customerUtils.refresh();
  }
  if (! countriesStore.isLoaded) {
    await countryUtils.getCountries();
  }
});

const showLoading = computed(() => {
  return isLoading.value || customerStore.isLoaded === false || countriesStore.isLoaded === false;
})

const identityUpdated = () => {
  isPersonalDetailsModalOpen.value = false;
  notify(
      {
        group: 'customer',
        title: t('account.personalDetailsUpdated'),
        text: t('account.yourPersonalInformationHas'),
        type: 'success',
      },
      -1,
  )
}

const addressUpdated = () => {
  isAddressModalOpen.value = false;
  notify(
      {
        group: 'customer',
        title: t('account.addressUpdated'),
        text: t('account.yourAddressDetailsHave'),
        type: 'success',
      },
      -1,
  )
}

const identityUpdateFailed = () => {
  isPersonalDetailsModalOpen.value = true;
}

const addressUpdateFailed = () => {
  isAddressModalOpen.value = true;
}

const passwordChanged = async () => {
  isChangePasswordModalOpen.value = false;
  await router.push({name: 'signIn', query: {referer: "change-password"}});
}

</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl lg:max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-lg bg-white px-4 sm:px-6 lg:px-8 py-6">
          <section aria-labelledby="section-2-title">
            <h1 class="sr-only" id="section-2-title">{{ $t('account.accountSettings') }}</h1>
            <div class="mb-6">
              <h2 class="text-base font-semibold text-gray-900">{{ $t('account.accountSettings') }}</h2>
              <p class="mt-1 text-sm/6 text-gray-500">{{ $t('account.settingsIntro') }}</p>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 lg:gap-8 max-w-2xl">
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <UserIcon class="h-6 w-6 text-brand-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">{{ $t('onboarding.personalDetails') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">{{ $t('account.personalDetailsHint') }}</p>
                <a href="javascript:" @click="isPersonalDetailsModalOpen = true" class="mt-auto text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800">{{ $t('account.modify') }} <span aria-hidden="true">→</span></a>
              </div>
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <HomeIcon class="h-6 w-6 text-brand-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">{{ $t('account.address') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">{{ $t('account.addressHint') }}</p>
                <a href="javascript:" @click="isAddressModalOpen = true" class="mt-auto text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800">{{ $t('account.modify') }} <span aria-hidden="true">→</span></a>
              </div>
              <div v-if="false" class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <PhoneIcon class="h-6 w-6 text-brand-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">{{ $t('auth.signIn.mobileNumberPlaceholder') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">{{ $t('account.mobileHint') }}</p>
                <a href="#" class="mt-auto text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800">{{ $t('account.update') }} <span aria-hidden="true">→</span></a>
              </div>
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <LockClosedIcon class="h-6 w-6 text-brand-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">{{ $t('common.password') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">{{ $t('account.passwordHint') }}</p>
                <a href="javascript:" @click="isChangePasswordModalOpen = true" class="mt-auto text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800">{{ $t('account.changePassword') }} <span aria-hidden="true">→</span></a>
              </div>
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <DevicePhoneMobileIcon class="h-6 w-6 text-brand-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">{{ $t('account.devices') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">{{ $t('account.devicesHint') }}</p>
                <router-link class="mt-auto text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800 cursor-pointer" :to="{name: 'devices'}">{{ $t('account.manageDevices') }} <span aria-hidden="true">→</span></router-link>
              </div>
              <div v-if="walletStore.isAvailable" class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <WalletIcon class="h-6 w-6 text-brand-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">{{ $t('account.wallet') }}</h3>
                <p v-if="walletStore.isEnrolled" class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3"><i18n-t keypath="account.walletNumberIs" scope="global"><template #number><span class="font-medium tracking-wider text-gray-900">{{ walletStore.subscription.data?.walletNumber }}</span></template></i18n-t><template v-if="walletStore.requiresReacceptance"> {{ $t('account.walletTermsPending') }}</template></p>
                <p v-else class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">{{ $t('account.walletHint') }}</p>
                <div class="mt-auto flex items-center gap-x-4">
                  <router-link class="text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800 cursor-pointer" :to="{name: 'wallet'}">{{ walletStore.isEnrolled ? $t('account.manageWallet') : $t('account.getStarted') }} <span aria-hidden="true">→</span></router-link>
                  <a v-if="walletStore.isEnrolled" href="javascript:" @click="closeWalletError = ''; isCloseWalletModalOpen = true" class="text-sm/6 inline-block font-medium text-danger-600 hover:text-danger-600">{{ $t('account.closeWallet') }}</a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
    <TransitionRoot as="div" :show="isChangePasswordModalOpen">
      <Dialog class="relative z-10" @close="isChangePasswordModalOpen = false">
        <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full min-w-sm md:min-w-md sm:max-w-2xl px-5 sm:px-6 lg:px-8 py-8">
                <ChangePassword
                    v-on:account:password:changed="passwordChanged"
                />
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
    <TransitionRoot as="div" :show="isPersonalDetailsModalOpen">
      <Dialog class="relative z-10" @close="isPersonalDetailsModalOpen = false">
        <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div class="rounded-t-md bg-brand-50 p-4">
                  <div class="flex">
                    <div class="ml-3 flex-1 md:flex md:justify-between">
                      <p class="text-xs/5 text-brand-700 max-w-sm">{{ $t('account.reverifyPersonalWarning') }}</p>
                    </div>
                  </div>
                </div>
                <div class="px-6 py-5">
                  <CustomerAttributeForm
                      v-bind:categories="`${CustomerAttributeCategory.IDENTITY}`"
                      v-bind:showLoading="showLoading"
                      v-bind:saveBtnText="$t('account.saveChanges')"
                      v-on:customer:attribute_category:updated="identityUpdated"
                      v-on:customer:attribute_category:update_failed="identityUpdateFailed"
                  />
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
    <TransitionRoot as="div" :show="isAddressModalOpen">
      <Dialog class="relative z-10" @close="isAddressModalOpen = false">
        <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl min-w-sm">
                <div class="rounded-t-md bg-brand-50 p-4">
                  <div class="flex">
                    <div class="ml-3 flex-1 md:flex md:justify-between">
                      <p class="text-xs/5 text-brand-700 max-w-sm">{{ $t('account.reverifyAddressWarning') }}</p>
                    </div>
                  </div>
                </div>
                <div class="px-6 py-5">
                  <CustomerAttributeForm
                      v-bind:categories="`${CustomerAttributeCategory.ADDRESS}`"
                      v-bind:showLoading="showLoading"
                      v-bind:saveBtnText="$t('account.saveChanges')"
                      v-on:customer:attribute_category:updated="addressUpdated"
                      v-on:customer:attribute_category:update_failed="addressUpdateFailed"
                  />
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
    <TransitionRoot as="template" :show="isCloseWalletModalOpen">
      <Dialog as="div" class="relative z-10" @close="isClosingWallet ? null : isCloseWalletModalOpen = false">
        <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-danger-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon class="h-6 w-6 text-danger-600" aria-hidden="true" />
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">{{ $t('account.closeYourWallet') }}</DialogTitle>
                    <div class="mt-2">
                      <DialogDescription class="text-sm/6 text-gray-500">{{ $t('account.closeWalletCondition') }}</DialogDescription>
                    </div>
                    <p v-if="closeWalletError" class="mt-2 text-sm/6 text-danger-600">{{ closeWalletError }}</p>
                  </div>
                </div>
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row">
                  <button type="button" class="inline-flex w-full justify-center rounded-md bg-danger-600 px-3 py-2 text-sm/6 font-semibold text-white shadow-sm hover:bg-danger-500 sm:mr-3 sm:w-auto cursor-pointer" @click="closeWallet" :disabled="isClosingWallet">
                    {{ isClosingWallet ? 'Closing...' : $t('account.closeWallet') }}
                  </button>
                  <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm/6 font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer" @click="isCloseWalletModalOpen = false" :disabled="isClosingWallet">{{ $t('account.keepWallet') }}</button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </CustomerLayout>
</template>
