<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useMonthlyBudgetUtils } from "@/composables/monthly_budget_utils.js";
import { useQuoteUtils } from "@/composables/quote_utils.js";
import MonthlyBudget from "@/models/monthly_budget.js";
import FlagIcon from "vue3-flag-icons";
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";

const emit = defineEmits(["budget:created", "cancel"]);

const monthlyBudgetUtils = useMonthlyBudgetUtils();
const quoteUtils = useQuoteUtils();

const isLoadingSources = ref(true);
const isSubmitting = ref(false);
const currencyOptions = ref([]);

const form = reactive({
  selectedSource: null,
  amount: "",
});

const formErrors = reactive({
  currency_id: [],
  amount: [],
  general: null,
});

onMounted(async () => {
  isLoadingSources.value = true;
  try {
    await quoteUtils.getQuote();
    currencyOptions.value = quoteUtils.quote.data?.sources ?? [];
    if (currencyOptions.value.length > 0) {
      form.selectedSource = currencyOptions.value[0];
    }
  } finally {
    isLoadingSources.value = false;
  }
});

const selectedCurrencyLabel = computed(() => {
  if (!form.selectedSource?.currency) return "Select currency";
  const currency = form.selectedSource.currency;
  const country = form.selectedSource.country;
  return `${currency.iconUnicode} ${currency.code} · ${country?.commonName ?? ""}`.trim();
});

function clearErrors() {
  formErrors.currency_id = [];
  formErrors.amount = [];
  formErrors.general = null;
}

async function submit() {
  clearErrors();
  const amount = parseFloat(String(form.amount).replace(/,/g, "").trim());
  if (!form.selectedSource?.currency?.id) {
    formErrors.currency_id = ["Please select a currency."];
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    formErrors.amount = ["Please enter a valid budget amount."];
    return;
  }

  isSubmitting.value = true;
  try {
    const response = await monthlyBudgetUtils.createBudget(
      form.selectedSource.currency.id,
      amount,
    );
    const budget = MonthlyBudget.getInstance(response.data);
    emit("budget:created", budget);
    form.amount = "";
  } catch (error) {
    if (error.response?.status === 422) {
      const errors = error.response.data?.errors ?? {};
      formErrors.currency_id = errors.currency_id ?? [];
      formErrors.amount = errors.amount ?? [];
      if (!formErrors.currency_id.length && !formErrors.amount.length) {
        formErrors.general = error.response.data?.message ?? "Unable to create budget.";
      }
    } else {
      formErrors.general = "Something went wrong. Please try again.";
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <div>
      <h3 class="text-lg font-semibold text-gray-900">Create monthly budget</h3>
      <p class="mt-1 text-sm text-gray-600">
        Set a spending limit for a currency. Track spent and remaining amounts throughout the month.
      </p>
    </div>

    <p v-if="formErrors.general" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ formErrors.general }}
    </p>

    <div v-if="isLoadingSources" class="flex justify-center py-8">
      <i class="pi pi-spin pi-spinner text-3xl text-brand-700" aria-hidden="true" />
    </div>

    <template v-else>
      <div>
        <Listbox v-model="form.selectedSource">
          <ListboxLabel class="block text-sm font-medium text-gray-700">Currency</ListboxLabel>
          <div class="relative mt-2">
            <ListboxButton
              class="relative w-full cursor-default rounded-xl bg-white py-3 pl-3 pr-10 text-left text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-600 sm:text-sm"
            >
              <span class="flex items-center gap-2 truncate">
                <FlagIcon
                  v-if="form.selectedSource?.country"
                  :code="form.selectedSource.country.iso2Alpha.toLowerCase()"
                  circle
                  class="shrink-0"
                />
                {{ selectedCurrencyLabel }}
              </span>
              <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon class="size-5 text-gray-400" aria-hidden="true" />
              </span>
            </ListboxButton>
            <transition
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <ListboxOptions
                class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none"
              >
                <ListboxOption
                  v-for="option in currencyOptions"
                  :key="`${option.country?.id}-${option.currency?.id}`"
                  v-slot="{ active, selected }"
                  :value="option"
                  as="template"
                >
                  <li
                    :class="[
                      active ? 'bg-brand-50 text-brand-900' : 'text-gray-900',
                      'relative cursor-default select-none py-3 pl-3 pr-9',
                    ]"
                  >
                    <span class="flex items-center gap-2">
                      <FlagIcon
                        v-if="option.country"
                        :code="option.country.iso2Alpha.toLowerCase()"
                        circle
                        class="shrink-0"
                      />
                      <span :class="[selected ? 'font-semibold' : 'font-normal', 'truncate']">
                        {{ option.currency?.iconUnicode }} {{ option.currency?.code }}
                        <span class="text-gray-500">· {{ option.country?.commonName }}</span>
                      </span>
                    </span>
                    <span
                      v-if="selected"
                      class="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-600"
                    >
                      <CheckIcon class="size-5" aria-hidden="true" />
                    </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>
        <p v-for="(message, index) in formErrors.currency_id" :key="index" class="mt-1 text-sm text-red-600">
          {{ message }}
        </p>
      </div>

      <div>
        <label for="budget-amount" class="block text-sm font-medium text-gray-700">Monthly amount</label>
        <div class="relative mt-2">
          <span
            v-if="form.selectedSource?.currency"
            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-gray-500"
          >
            {{ form.selectedSource.currency.iconUnicode }}
          </span>
          <input
            id="budget-amount"
            v-model="form.amount"
            type="text"
            inputmode="decimal"
            placeholder="1,000.00"
            :class="[
              form.selectedSource?.currency ? 'pl-8' : 'pl-3',
              'block w-full rounded-xl border-0 py-3 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm',
            ]"
          />
        </div>
        <p v-for="(message, index) in formErrors.amount" :key="index" class="mt-1 text-sm text-red-600">
          {{ message }}
        </p>
      </div>
    </template>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        :disabled="isSubmitting"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="inline-flex justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isSubmitting || isLoadingSources"
      >
        <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
        Create budget
      </button>
    </div>
  </form>
</template>
