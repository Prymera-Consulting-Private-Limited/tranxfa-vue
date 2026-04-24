<script setup>
import CustomerLayout from '@/components/CustomerLayout.vue'
import CustomerAttributeForm from '@/components/Customer/CustomerAttributeForm.vue'
import CustomerAttributeCategory from '@/enums/customer_attribute_category.js'
import { useCustomerStore } from '@/stores/customer.js'
import { useCountriesStore } from '@/stores/countries.js'
import { useCustomerUtils } from '@/composables/customer_utils.js'
import { useCountryUtils } from '@/composables/country_utils.js'
import { notify } from 'notiwind'
import {
  UserIcon,
  IdentificationIcon,
  MapPinIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import moment from 'moment'

const customerStore = useCustomerStore()
const countriesStore = useCountriesStore()
const customerUtils = useCustomerUtils()
const countryUtils = useCountryUtils()

const isPersonalDetailsModalOpen = ref(false)
const isAddressModalOpen = ref(false)
const formModalKey = ref(0)

onMounted(async () => {
  if (!customerStore.isLoaded) {
    await customerUtils.refresh()
  }
  if (!countriesStore.isLoaded) {
    await countryUtils.getCountries()
  }
})

const showLoading = computed(
  () => customerStore.isLoaded === false || countriesStore.isLoaded === false,
)

const customer = computed(() => customerStore.customer.data)

const displayName = computed(() => {
  const c = customer.value
  if (!c) return ''
  return c.wholeName || [c.name, c.secondName, c.thirdName].filter(Boolean).join(' ') || '—'
})

const identityRows = computed(() => {
  const attrs = customer.value?.attributes ?? []
  return attrs.filter((a) => a.category === CustomerAttributeCategory.IDENTITY)
})

const addressRows = computed(() => {
  const attrs = customer.value?.attributes ?? []
  return attrs.filter((a) => a.category === CustomerAttributeCategory.ADDRESS)
})

function emptyDisplay(val) {
  return val === null || val === undefined || val === ''
}

/** Calendar date only (no time) for API ISO strings */
function formatDateOnly(val) {
  if (emptyDisplay(val)) return '—'
  const s = String(val)
  const m = moment(s)
  if (!m.isValid()) return s
  return m.format('YYYY-MM-DD')
}

function isLikelyIsoDateTime(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)
}

/**
 * Profile table: resolve nationality_id to country name; strip time from DOB / date fields.
 */
function formatProfileAttributeValue(attr) {
  if (!attr || emptyDisplay(attr.value)) return '—'

  const key = attr.attribute
  const raw = attr.value

  if (key === 'nationality_id') {
    const id = String(raw)
    const nat = customer.value?.nationality
    if (nat && String(nat.id) === id) {
      return nat.demonym || nat.commonName || nat.officialName || id
    }
    const list = countriesStore.countries?.data ?? []
    const found = list.find((c) => String(c.id) === id)
    if (found) {
      return found.demonym || found.commonName || found.officialName || id
    }
    return '—'
  }

  if (key === 'birth_detail.birth_date') {
    return formatDateOnly(raw)
  }

  if (isLikelyIsoDateTime(raw)) {
    return formatDateOnly(raw)
  }

  return String(raw)
}

function openPersonalModal() {
  formModalKey.value += 1
  isPersonalDetailsModalOpen.value = true
}

function openAddressModal() {
  formModalKey.value += 1
  isAddressModalOpen.value = true
}

async function identityUpdated() {
  await customerUtils.refresh()
  isPersonalDetailsModalOpen.value = false
  notify(
    {
      group: 'customer',
      title: 'Personal details updated',
      text: 'Your personal information has been successfully updated.',
      type: 'success',
    },
    -1,
  )
}

async function addressUpdated() {
  await customerUtils.refresh()
  isAddressModalOpen.value = false
  notify(
    {
      group: 'customer',
      title: 'Address updated',
      text: 'Your address details have been successfully updated.',
      type: 'success',
    },
    -1,
  )
}

function identityUpdateFailed() {
  isPersonalDetailsModalOpen.value = true
}

function addressUpdateFailed() {
  isAddressModalOpen.value = true
}
</script>

<template>
  <CustomerLayout>
    <main class="relative">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:max-w-full lg:px-8">
        <section
          class="relative overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-900/[0.04]"
          aria-labelledby="accounts-heading"
        >
          <div
            class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-25%,rgba(20,184,166,0.14),transparent)]"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-violet-400/[0.12] blur-3xl sm:right-10"
            aria-hidden="true"
          />

          <div class="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <header class="mb-8 flex flex-col gap-6 border-b border-gray-100 pb-8 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:pb-10">
              <div class="min-w-0 max-w-2xl">
                <p
                  class="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100/90 bg-brand-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-800"
                >
                  <UserIcon class="size-3.5 text-brand-600" aria-hidden="true" />
                  Accounts
                </p>
                <h1
                  id="accounts-heading"
                  class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
                >
                  Your
                  <span
                    class="bg-gradient-to-r from-brand-600 via-teal-600 to-brand-500 bg-clip-text text-transparent"
                  >
                    profile
                  </span>
                </h1>
                <p class="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                  Review the details we hold for you. Use edit to update personal information or
                  your address.
                </p>
              </div>
              <RouterLink
                :to="{ name: 'settings' }"
                class="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/80 hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                All settings
              </RouterLink>
            </header>

            <div v-if="showLoading" class="flex min-h-[12rem] items-center justify-center py-12">
              <div
                class="size-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
                role="status"
                aria-label="Loading profile"
              />
            </div>

            <div v-else class="mx-auto max-w-full space-y-8">
              <!-- Summary card -->
              <div
                class="flex flex-col gap-6 rounded-2xl border border-gray-200/90 bg-gradient-to-br from-white to-brand-50/20 p-6 shadow-sm sm:flex-row sm:items-center sm:gap-8 sm:p-8"
              >
                <div
                  class="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white shadow-md ring-4 ring-brand-100"
                  aria-hidden="true"
                >
                  {{
                    (customer?.name || displayName).charAt(0).toUpperCase() || '?'
                  }}
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="truncate text-xl font-bold text-gray-900">
                    {{ displayName }}
                  </h2>
                  <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div v-if="customer?.account?.email" class="flex flex-col gap-0.5">
                      <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Email
                      </dt>
                      <dd class="truncate font-medium text-gray-900">
                        {{ customer.account.email }}
                      </dd>
                    </div>
                    <div v-if="customer?.crn != null" class="flex flex-col gap-0.5">
                      <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Customer reference
                      </dt>
                      <dd class="font-medium text-gray-900">
                        {{ customer.crn }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <!-- Personal details -->
              <article
                class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm transition hover:shadow-md"
              >
                <div
                  class="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div class="flex items-start gap-3">
                    <span
                      class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700"
                    >
                      <IdentificationIcon class="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 class="text-base font-semibold text-gray-900">Personal details</h2>
                      <p class="mt-0.5 text-sm text-gray-600">
                        Name, date of birth, and other identity fields on file.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:w-auto"
                    @click="openPersonalModal"
                  >
                    <PencilSquareIcon class="size-5" aria-hidden="true" />
                    Edit
                  </button>
                </div>
                <dl class="divide-y divide-gray-100 px-5 py-2 sm:px-6">
                  <div
                    v-for="row in identityRows"
                    :key="row.attribute"
                    class="grid gap-1 py-3 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-baseline sm:gap-4"
                  >
                    <dt class="text-sm font-medium text-gray-500">
                      {{ row.label }}
                    </dt>
                    <dd class="text-sm text-gray-900">
                      {{ formatProfileAttributeValue(row) }}
                    </dd>
                  </div>
                  <p
                    v-if="identityRows.length === 0"
                    class="py-6 text-center text-sm text-gray-500"
                  >
                    No identity fields loaded yet.
                  </p>
                </dl>
              </article>

              <!-- Address -->
              <article
                class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm transition hover:shadow-md"
              >
                <div
                  class="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div class="flex items-start gap-3">
                    <span
                      class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"
                    >
                      <MapPinIcon class="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 class="text-base font-semibold text-gray-900">Address</h2>
                      <p class="mt-0.5 text-sm text-gray-600">
                        Residential and mailing details we use for your profile.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:w-auto"
                    @click="openAddressModal"
                  >
                    <PencilSquareIcon class="size-5" aria-hidden="true" />
                    Edit
                  </button>
                </div>
                <dl class="divide-y divide-gray-100 px-5 py-2 sm:px-6">
                  <div
                    v-for="row in addressRows"
                    :key="row.attribute"
                    class="grid gap-1 py-3 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-baseline sm:gap-4"
                  >
                    <dt class="text-sm font-medium text-gray-500">
                      {{ row.label }}
                    </dt>
                    <dd class="text-sm text-gray-900">
                      {{ formatProfileAttributeValue(row) }}
                    </dd>
                  </div>
                  <p
                    v-if="addressRows.length === 0"
                    class="py-6 text-center text-sm text-gray-500"
                  >
                    No address fields loaded yet.
                  </p>
                </dl>
              </article>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Personal details modal (same pattern as Settings) -->
    <TransitionRoot as="div" :show="isPersonalDetailsModalOpen">
      <Dialog class="relative z-50" @close="isPersonalDetailsModalOpen = false">
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                class="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all"
              >
                <div class="rounded-t-xl bg-brand-50 p-4 sm:p-5">
                  <p class="text-xs leading-relaxed text-brand-800 sm:text-sm">
                    Updating verified personal details may require re-verification of your identity to
                    ensure accuracy and compliance. Please review changes carefully before proceeding.
                  </p>
                </div>
                <div class="max-h-[min(70vh,36rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                  <CustomerAttributeForm
                    :key="`identity-${formModalKey}`"
                    :categories="`${CustomerAttributeCategory.IDENTITY}`"
                    :show-loading="showLoading"
                    save-btn-text="Save changes"
                    @customer:attribute_category:updated="identityUpdated"
                    @customer:attribute_category:update_failed="identityUpdateFailed"
                  />
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Address modal -->
    <TransitionRoot as="div" :show="isAddressModalOpen">
      <Dialog class="relative z-50" @close="isAddressModalOpen = false">
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                class="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all"
              >
                <div class="rounded-t-xl bg-brand-50 p-4 sm:p-5">
                  <p class="text-xs leading-relaxed text-brand-800 sm:text-sm">
                    Updating your address may require re-verification of your address to ensure
                    accuracy and compliance. Please review your changes carefully before proceeding.
                  </p>
                </div>
                <div class="max-h-[min(70vh,36rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                  <CustomerAttributeForm
                    :key="`address-${formModalKey}`"
                    :categories="`${CustomerAttributeCategory.ADDRESS}`"
                    :show-loading="showLoading"
                    save-btn-text="Save changes"
                    @customer:attribute_category:updated="addressUpdated"
                    @customer:attribute_category:update_failed="addressUpdateFailed"
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
