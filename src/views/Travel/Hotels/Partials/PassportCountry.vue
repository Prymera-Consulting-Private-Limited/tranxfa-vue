<script setup>
import {computed, ref} from "vue";
import FlagIcon from 'vue3-flag-icons';
import {IdentificationIcon} from "@heroicons/vue/24/outline";
import CountryVSelectInput from "@/components/CustomerAttribute/CountryVSelectInput.vue";

// The country that issued the guests' passports, which the supplier prices on and
// can withhold rooms by (SD-1775). Known, it is a line the customer can change for
// a stay that is someone else's; unknown, it is the question the search waits on.
const props = defineProps({
  residency: {
    type: String,
    default: null,
  },

  countries: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['update:residency']);

const isChanging = ref(false);

// A code from the url is shown as it is until the country list has arrived.
const country = computed(() => props.countries.find(option => option.iso2Alpha === props.residency) ?? null);

/**
 * The picker opens empty rather than on the current country: it reports its
 * starting value as a change, which would close it the moment it opened.
 *
 * @param {Country|null} selected
 */
function choose(selected) {
  if (!selected?.iso2Alpha) {
    return;
  }

  isChanging.value = false;

  if (selected.iso2Alpha !== props.residency) {
    emit('update:residency', selected.iso2Alpha);
  }
}
</script>

<template>
  <div v-if="residency" class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm/6 text-gray-600">
    <span>{{ $t('travel.guestsPassportsFrom') }}</span>
    <span class="inline-flex items-center gap-1.5 font-medium text-gray-900">
      <FlagIcon v-if="country" :code="country.iso2Alpha.toLowerCase()" circle />
      {{ country?.commonName ?? residency }}
    </span>
    <button v-if="!isChanging" type="button" @click="isChanging = true" class="cursor-pointer font-medium text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('onboarding.change') }}</button>
    <div v-else class="w-full sm:w-72">
      <CountryVSelectInput
          v-bind:countries="countries"
          v-bind:model="null"
          v-bind:optionLabelGenerator="'commonName'"
          v-bind:itemLabelGenerator="'commonName'"
          v-on:update:modelValue="choose"
      />
    </div>
  </div>
  <section v-else class="rounded-2xl border border-gray-200 bg-white px-6 py-8 sm:px-8">
    <div class="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
      <IdentificationIcon class="size-6" aria-hidden="true" />
    </div>
    <p class="mt-5 text-sm/6 font-medium text-gray-900">{{ $t('travel.passportCountry') }}</p>
    <div class="mt-2 max-w-sm">
      <CountryVSelectInput
          v-bind:countries="countries"
          v-bind:model="null"
          v-bind:optionLabelGenerator="'commonName'"
          v-bind:itemLabelGenerator="'commonName'"
          v-on:update:modelValue="choose"
      />
    </div>
  </section>
</template>
