<script setup>
import { computed, reactive, ref, watch } from "vue";
import moment from "moment";
import VueDatePicker from "@vuepic/vue-datepicker";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import { useTransactionStatementUtils } from "@/composables/transaction_statement_utils.js";
import Currency from "@/models/currency.js";
import { notify } from "notiwind";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const statementUtils = useTransactionStatementUtils();

const isLoadingCurrencies = ref(false);
const isSubmitting = ref(false);
const currencies = ref([]);

const today = computed(() => moment().format("YYYY-MM-DD"));

const form = reactive({
  startDate: null,
  endDate: null,
  type: "pdf",
  currencyId: "",
  email: "",
});

const formErrors = reactive({
  start_date: [],
  end_date: [],
  type: [],
  email: [],
  currency: [],
  general: null,
});

function resetForm() {
  form.startDate = null;
  form.endDate = null;
  form.type = "pdf";
  form.currencyId = "";
  form.email = "";
  clearErrors();
}

function clearErrors() {
  formErrors.start_date = [];
  formErrors.end_date = [];
  formErrors.type = [];
  formErrors.email = [];
  formErrors.currency = [];
  formErrors.general = null;
}

function formatDateForApi(date) {
  if (!date) return null;
  return moment(date).format("YYYY-MM-DD");
}

function validateClient() {
  clearErrors();
  let valid = true;
  const start = formatDateForApi(form.startDate);
  const end = formatDateForApi(form.endDate);

  if (!start) {
    formErrors.start_date = ["Please select a start date."];
    valid = false;
  } else if (moment(start).isAfter(today.value, "day")) {
    formErrors.start_date = ["Start date cannot be in the future."];
    valid = false;
  }

  if (!end) {
    formErrors.end_date = ["Please select an end date."];
    valid = false;
  } else if (moment(end).isAfter(today.value, "day")) {
    formErrors.end_date = ["End date cannot be in the future."];
    valid = false;
  }

  if (start && end && moment(start).isAfter(end, "day")) {
    formErrors.end_date = ["End date must be on or after the start date."];
    valid = false;
  }

  if (form.email.trim() && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
    formErrors.email = ["Please enter a valid email address."];
    valid = false;
  }

  return valid;
}

async function loadCurrencies() {
  isLoadingCurrencies.value = true;
  try {
    const response = await statementUtils.getPaymentCurrencies();
    currencies.value = (response.data?.data ?? []).map((row) => Currency.getInstance(row));
  } catch {
    currencies.value = [];
  } finally {
    isLoadingCurrencies.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetForm();
      loadCurrencies();
    }
  },
);

function close() {
  if (!isSubmitting.value) {
    emit("close");
  }
}

async function submit() {
  if (!validateClient()) {
    return;
  }

  isSubmitting.value = true;
  clearErrors();

  const payload = {
    start_date: formatDateForApi(form.startDate),
    end_date: formatDateForApi(form.endDate),
    type: form.type,
  };

  if (form.currencyId) {
    payload.currency = form.currencyId;
  }

  const email = form.email.trim();
  if (email) {
    payload.email = email;
  }

  try {
    const response = await statementUtils.requestStatement(payload);
    const message =
      response.data?.message ??
      "Statement generation started successfully. Please check your email shortly.";

    notify(
      {
        group: "customer",
        title: "Statement requested",
        text: message,
        type: "success",
      },
      -1,
    );
    emit("close");
  } catch (error) {
    const status = error.response?.status;

    if (status === 412) {
      formErrors.general =
        error.response?.data?.message ??
        "Your account must be fully verified to download statements.";
      notify(
        {
          group: "customer",
          title: "Verification required",
          text: formErrors.general,
          type: "warning",
        },
        -1,
      );
      return;
    }

    if (status === 422) {
      const errors = error.response?.data?.errors ?? {};
      formErrors.start_date = errors.start_date ?? [];
      formErrors.end_date = errors.end_date ?? [];
      formErrors.type = errors.type ?? [];
      formErrors.email = errors.email ?? [];
      formErrors.currency = errors.currency ?? [];
      if (
        !formErrors.start_date.length &&
        !formErrors.end_date.length &&
        !formErrors.type.length &&
        !formErrors.email.length &&
        !formErrors.currency.length
      ) {
        formErrors.general = error.response?.data?.message ?? "Please check the form and try again.";
      }
      return;
    }

    formErrors.general = "Something went wrong. Please try again.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild
        as="template"
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
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="relative w-full transform overflow-hidden rounded-2xl bg-white px-5 pb-6 pt-5 text-left shadow-xl transition-all sm:my-8 sm:max-w-lg sm:p-6"
            >
              <DialogTitle class="text-lg font-semibold text-gray-900">
                Download transaction statement
              </DialogTitle>
              <p class="mt-1 text-sm text-gray-600">
                Choose a date range and format. We will email the statement when it is ready — it is not downloaded here.
              </p>

              <form class="mt-6 space-y-5" @submit.prevent="submit">
                <p
                  v-if="formErrors.general"
                  class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {{ formErrors.general }}
                </p>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Start date</label>
                    <div class="statement-date-picker mt-2">
                      <VueDatePicker
                        v-model="form.startDate"
                        :enable-time-picker="false"
                        :max-date="today"
                        format="yyyy-MM-dd"
                        preview-format="yyyy-MM-dd"
                        hide-input-icon
                        auto-apply
                        teleport="body"
                        position="left"
                        placeholder="Select start date"
                      />
                    </div>
                    <p
                      v-for="(msg, i) in formErrors.start_date"
                      :key="`start-${i}`"
                      class="mt-1 text-sm text-red-600"
                    >
                      {{ msg }}
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">End date</label>
                    <div class="statement-date-picker mt-2">
                      <VueDatePicker
                        v-model="form.endDate"
                        :enable-time-picker="false"
                        :max-date="today"
                        format="yyyy-MM-dd"
                        preview-format="yyyy-MM-dd"
                        hide-input-icon
                        auto-apply
                        teleport="body"
                        position="left"
                        placeholder="Select end date"
                      />
                    </div>
                    <p
                      v-for="(msg, i) in formErrors.end_date"
                      :key="`end-${i}`"
                      class="mt-1 text-sm text-red-600"
                    >
                      {{ msg }}
                    </p>
                  </div>
                </div>

                <div>
                  <span class="block text-sm font-medium text-gray-700">Format</span>
                  <div class="mt-2 flex gap-3">
                    <label class="inline-flex cursor-pointer items-center gap-2">
                      <input
                        v-model="form.type"
                        type="radio"
                        value="pdf"
                        class="border-gray-300 text-brand-600 focus:ring-brand-600"
                      />
                      <span class="text-sm text-gray-900">PDF</span>
                    </label>
                    <label class="inline-flex cursor-pointer items-center gap-2">
                      <input
                        v-model="form.type"
                        type="radio"
                        value="csv"
                        class="border-gray-300 text-brand-600 focus:ring-brand-600"
                      />
                      <span class="text-sm text-gray-900">CSV</span>
                    </label>
                  </div>
                  <p
                    v-for="(msg, i) in formErrors.type"
                    :key="`type-${i}`"
                    class="mt-1 text-sm text-red-600"
                  >
                    {{ msg }}
                  </p>
                </div>

                <div>
                  <label for="statement-currency" class="block text-sm font-medium text-gray-700">
                    Currency <span class="font-normal text-gray-500">(optional)</span>
                  </label>
                  <select
                    id="statement-currency"
                    v-model="form.currencyId"
                    :disabled="isLoadingCurrencies"
                    class="mt-2 block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm disabled:bg-gray-50"
                  >
                    <option value="">All currencies</option>
                    <option v-for="currency in currencies" :key="currency.id" :value="currency.id">
                      {{ currency.iconUnicode }} {{ currency.code }} — {{ currency.commonName }}
                    </option>
                  </select>
                  <p
                    v-for="(msg, i) in formErrors.currency"
                    :key="`currency-${i}`"
                    class="mt-1 text-sm text-red-600"
                  >
                    {{ msg }}
                  </p>
                </div>

                <div>
                  <label for="statement-email" class="block text-sm font-medium text-gray-700">
                    Additional email <span class="font-normal text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="statement-email"
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    placeholder="name@example.com"
                    class="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm"
                  />
                  <p
                    v-for="(msg, i) in formErrors.email"
                    :key="`email-${i}`"
                    class="mt-1 text-sm text-red-600"
                  >
                    {{ msg }}
                  </p>
                </div>

                <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    class="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    :disabled="isSubmitting"
                    @click="close"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="inline-flex justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isSubmitting || isLoadingCurrencies"
                  >
                    <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
                    Request statement
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
.statement-date-picker {
  width: 100%;
}

.statement-date-picker :deep(.dp__main) {
  width: 100%;
}

.statement-date-picker :deep(.dp__input_wrap) {
  width: 100%;
}

.statement-date-picker :deep(.dp__input) {
  width: 100%;
  border-radius: 0.75rem;
  border: 0;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: rgb(17 24 39);
  box-shadow: inset 0 0 0 1px rgb(209 213 219);
}

.statement-date-picker :deep(.dp__input:focus) {
  outline: none;
  box-shadow: inset 0 0 0 2px rgb(0 63 125);
}
</style>
