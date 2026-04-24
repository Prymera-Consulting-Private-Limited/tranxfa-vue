<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { UserIcon, HomeIcon, PhoneIcon, LockClosedIcon, DevicePhoneMobileIcon } from '@heroicons/vue/24/outline';
import {Dialog, DialogPanel, TransitionChild, TransitionRoot} from "@headlessui/vue";
import {computed, onMounted, ref} from "vue";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";
import CustomerAttributeForm from "@/components/Customer/CustomerAttributeForm.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCountriesStore} from "@/stores/countries.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountryUtils} from "@/composables/country_utils.js";
import {notify} from 'notiwind';
import ChangePassword from "@/components/ChangePassword.vue";
import router from "@/router/index.js";

const isPersonalDetailsModalOpen = ref(false);
const isAddressModalOpen = ref(false);
const isChangePasswordModalOpen = ref(false);

const isLoading = ref(false)
const customerStore = useCustomerStore()
const countriesStore = useCountriesStore();
const countryUtils = useCountryUtils();
const customerUtils = useCustomerUtils()

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
        title: 'Personal Details Updated',
        text: 'Your personal information has been successfully updated.',
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
        title: 'Address Updated',
        text: 'Your address details have been successfully updated.',
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
    <main class="relative">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:max-w-full lg:px-8">
        <section
          aria-labelledby="section-2-title"
          class="relative overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-900/[0.04]"
        >
          <div
            class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-25%,rgba(20,184,166,0.14),transparent)]"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-violet-400/[0.12] blur-3xl sm:right-10"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-brand-400/[0.08] blur-3xl"
            aria-hidden="true"
          />

          <div class="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <h1 class="sr-only" id="section-2-title">Account Settings</h1>

            <header class="mb-10 max-w-2xl lg:mb-12">
              <p
                class="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100/90 bg-brand-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-800"
              >
                <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" aria-hidden="true" />
                Your account
              </p>
              <h2 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Account
                <span
                  class="bg-gradient-to-r from-brand-600 via-teal-600 to-brand-500 bg-clip-text text-transparent"
                >
                  settings
                </span>
              </h2>
              <p class="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                Manage your personal details, security settings, and connected devices all in one place.
              </p>
            </header>

            <div class="grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:gap-7">
              <article
                class="group relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/50 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300/70 hover:shadow-md lg:min-h-[12rem] lg:p-6"
              >
                <div
                  class="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-brand-400/15 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <div
                  class="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200/50 transition duration-300 group-hover:scale-[1.03] group-hover:shadow-md"
                >
                  <UserIcon class="h-6 w-6" />
                </div>
                <h3 class="text-base font-semibold text-gray-900">Personal Details</h3>
                <p class="mt-2 flex-grow text-sm leading-relaxed text-gray-600">
                  View and update your name, email address, and other personal information.
                </p>
                <a
                  href="javascript:"
                  class="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:gap-2.5 hover:text-brand-500"
                  @click="isPersonalDetailsModalOpen = true"
                >
                  Modify
                  <span aria-hidden="true">→</span>
                </a>
              </article>

              <article
                class="group relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-gradient-to-b from-white to-emerald-50/20 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200/90 hover:shadow-md lg:min-h-[12rem] lg:p-6"
              >
                <div
                  class="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-400/15 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <div
                  class="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50/90 text-emerald-700 shadow-sm ring-1 ring-emerald-200/60 transition duration-300 group-hover:scale-[1.03] group-hover:shadow-md"
                >
                  <HomeIcon class="h-6 w-6" />
                </div>
                <h3 class="text-base font-semibold text-gray-900">Address</h3>
                <p class="mt-2 flex-grow text-sm leading-relaxed text-gray-600">
                  Ensure your billing and shipping address details are up-to-date.
                </p>
                <a
                  href="javascript:"
                  class="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition hover:gap-2.5 hover:text-emerald-600"
                  @click="isAddressModalOpen = true"
                >
                  Modify
                  <span aria-hidden="true">→</span>
                </a>
              </article>

              <div
                v-if="false"
                class="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 lg:p-6"
              >
                <PhoneIcon class="mb-2 h-6 w-6 text-brand-600" />
                <h3 class="text-base font-semibold text-gray-900">Mobile Number</h3>
                <p class="mt-2 flex-grow text-sm text-gray-500">
                  Update your phone number for account recovery and notifications.
                </p>
                <a href="#" class="mt-auto text-sm font-semibold text-brand-600 hover:text-brand-500">Update &rarr;</a>
              </div>

              <article
                class="group relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-gradient-to-b from-white to-amber-50/25 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/90 hover:shadow-md lg:min-h-[12rem] lg:p-6"
              >
                <div
                  class="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/15 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <div
                  class="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-800 shadow-sm ring-1 ring-amber-200/70 transition duration-300 group-hover:scale-[1.03] group-hover:shadow-md"
                >
                  <LockClosedIcon class="h-6 w-6" />
                </div>
                <h3 class="text-base font-semibold text-gray-900">Password</h3>
                <p class="mt-2 flex-grow text-sm leading-relaxed text-gray-600">
                  Change your password to keep your account secure.
                </p>
                <a
                  href="javascript:"
                  class="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 transition hover:gap-2.5 hover:text-amber-700"
                  @click="isChangePasswordModalOpen = true"
                >
                  Change Password
                  <span aria-hidden="true">→</span>
                </a>
              </article>

              <article
                class="group relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-gradient-to-b from-white to-indigo-50/25 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200/90 hover:shadow-md lg:min-h-[12rem] lg:p-6"
              >
                <div
                  class="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-indigo-400/15 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <div
                  class="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200/60 transition duration-300 group-hover:scale-[1.03] group-hover:shadow-md"
                >
                  <DevicePhoneMobileIcon class="h-6 w-6" />
                </div>
                <h3 class="text-base font-semibold text-gray-900">Devices</h3>
                <p class="mt-2 flex-grow text-sm leading-relaxed text-gray-600">
                  Manage devices that have access to your account.
                </p>
                <router-link
                  class="relative mt-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-indigo-700 transition hover:gap-2.5 hover:text-indigo-600"
                  :to="{ name: 'devices' }"
                >
                  Manage Devices
                  <span aria-hidden="true">→</span>
                </router-link>
              </article>
            </div>
          </div>
        </section>
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
                      <p class="text-xs text-brand-700 max-w-sm">Updating verified personal details may require re-verification of your identity to ensure accuracy and compliance. Please review changes carefully before proceeding.</p>
                    </div>
                  </div>
                </div>
                <div class="px-6 py-5">
                  <CustomerAttributeForm
                      v-bind:categories="`${CustomerAttributeCategory.IDENTITY}`"
                      v-bind:showLoading="showLoading"
                      v-bind:saveBtnText="'Save Changes'"
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
                      <p class="text-xs text-brand-700 max-w-sm">Updating your address may require re-verification of your address to ensure accuracy and compliance. Please review your changes carefully before proceeding.</p>
                    </div>
                  </div>
                </div>
                <div class="px-6 py-5">
                  <CustomerAttributeForm
                      v-bind:categories="`${CustomerAttributeCategory.ADDRESS}`"
                      v-bind:showLoading="showLoading"
                      v-bind:saveBtnText="'Save Changes'"
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
  </CustomerLayout>
</template>
