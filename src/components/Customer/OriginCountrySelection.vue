<script setup>
import {computed, onMounted, ref} from "vue";
import {useCountryUtils} from "@/composables/country_utils.js";
import FlagIcon from "vue3-flag-icons";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";

const customerStore = useCustomerStore();
const countryUtils = useCountryUtils();
const customerUtils = useCustomerUtils();

const isLoading = ref(true);
const isSaving = ref(false);
const searchQuery = ref('');
const emit = defineEmits(['countryUpdated']);

function countrySearchText(country) {
  return [
    country.commonName,
    country.officialName,
    country.endonym,
    country.iso2Alpha,
    country.iso3Alpha,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const filteredCountries = computed(() => {
  const countries = countryUtils.sources.value ?? [];
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return countries;
  }
  return countries.filter((country) => countrySearchText(country).includes(query));
});

async function updateCountry(country) {
  if (isSaving.value) {
    return;
  }
  isSaving.value = true;
  await customerUtils.updateCountry(country);
  emit('countryUpdated');
}

onMounted(async () => {
  if (!customerStore.isLoaded) {
    await customerUtils.refresh();
  }
  await countryUtils.getSources().finally(() => {
    isLoading.value = false;
  });
});
</script>

<template>
  <div class="relative flex-1 flex items-center justify-center p-4 md:p-8">
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! isLoading || isSaving" class="w-full max-w-xl">
      <!-- Logo at Top Left (Desktop)  -->
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 text-left  mt-14 sm:mt-8">¿Dónde vives?</h2>
      <p class="text-md text-[#B7A3C1] mb-8 text-left">Para darte el mejor servicio, necesitamos saber tu país de residencia. Selecciona tu país para continuar.</p>

      <div v-if="isSaving" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
        <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
      </div>

      <template v-if="countryUtils.sources.value?.length > 0">
        <div class="relative mb-4 shrink-0">
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <i class="pi pi-search text-gray-400"></i>
          </span>
          <input
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            placeholder="Buscar país..."
            class="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-gray-900 placeholder:text-gray-400 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label="Borrar búsqueda"
            @click="searchQuery = ''"
          >
            <i class="pi pi-times text-sm"></i>
          </button>
        </div>

        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-gray-50/50"
          style="max-height: min(50vh, 28rem);"
        >
          <ul
            v-if="filteredCountries.length > 0"
            role="list"
            class="flex flex-col gap-2 p-2"
          >
            <li
              v-for="country in filteredCountries"
              :key="country.id"
              class="flex cursor-pointer rounded-md border border-gray-200 bg-white shadow-xs transition-colors hover:border-brand-700"
              @click="updateCountry(country)"
            >
              <div class="flex shrink-0 items-center justify-center rounded-l-md px-4 py-3">
                <FlagIcon :class="['text-2xl']" :code="country.iso2Alpha.toLowerCase()" circle />
              </div>
              <div class="flex min-w-0 flex-1 items-center py-3 pr-4">
                <div class="min-w-0 flex-1 truncate pl-0 text-sm">
                  <p class="truncate font-medium text-gray-900">{{ country.commonName }}</p>
                  <p class="truncate text-gray-500">{{ country.endonym ?? country.officialName }}</p>
                </div>
              </div>
            </li>
          </ul>
          <p
            v-else
            class="px-4 py-8 text-center text-sm text-gray-500"
          >
            No se encontraron países para «{{ searchQuery.trim() }}».
          </p>
        </div>
      </template>

      <ul
        v-else
        role="list"
        class="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden"
        style="max-height: min(50vh, 28rem);"
      >
        <template v-for="i in 4" :key="i">
          <li class="col-span-1 flex rounded-md">
            <div class="flex shrink-0 items-center justify-center rounded-l-md border border-gray-200 bg-white px-4 py-3">
              <span class="size-10 animate-pulse rounded-full bg-gray-200"></span>
            </div>
            <div class="flex min-w-0 flex-1 items-center rounded-r-md border border-l-0 border-gray-200 bg-white py-3 pr-4">
              <div class="min-w-0 flex-1 truncate pl-4 text-sm">
                <div class="h-4 w-24 animate-pulse bg-gray-200"></div>
                <div class="mt-2 h-2 w-16 animate-pulse bg-gray-200"></div>
              </div>
            </div>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

