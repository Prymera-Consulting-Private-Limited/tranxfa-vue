<script setup>
import MonthlyBudget from "@/models/monthly_budget.js";
import { computed } from "vue";

const props = defineProps({
  budget: {
    type: MonthlyBudget,
    required: true,
  },
});

const utilizationValue = computed(() => {
  const raw = props.budget.utilizationPercentage;
  if (raw == null) return 0;
  const parsed = parseFloat(String(raw).replace("%", "").trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
});

const utilizationLabel = computed(() => {
  const raw = props.budget.utilizationPercentage;
  if (raw == null || String(raw).trim() === "") return "0%";
  return String(raw).includes("%") ? String(raw) : `${raw}%`;
});

const ringClass = computed(() => {
  const value = utilizationValue.value;
  if (value >= 90) return "from-red-500 to-red-600";
  if (value >= 70) return "from-amber-400 to-amber-500";
  return "from-brand-500 to-brand-700";
});
</script>

<template>
  <div
    class="group flex min-w-[5.5rem] max-w-[5.5rem] flex-col items-center"
    :title="`${budget.currency?.code}: ${budget.remainingFormattedCurrencyPrefixed} remaining`"
  >
    <div class="relative flex size-14 items-center justify-center">
      <svg class="absolute inset-0 size-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="24" fill="none" class="stroke-gray-100" stroke-width="4" />
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="none"
          :class="['stroke-current transition-all duration-300', utilizationValue >= 90 ? 'text-red-500' : utilizationValue >= 70 ? 'text-amber-500' : 'text-brand-600']"
          stroke-width="4"
          stroke-linecap="round"
          :stroke-dasharray="150.8"
          :stroke-dashoffset="150.8 - (150.8 * utilizationValue) / 100"
        />
      </svg>
      <div
        :class="[
          'relative flex size-11 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white shadow-sm ring-2 ring-white transition group-hover:scale-105',
          ringClass,
        ]"
      >
        {{ budget.currency?.iconUnicode || "¤" }}
      </div>
    </div>
    <span class="mt-2 w-full truncate text-center text-xs font-semibold text-gray-800">
      {{ budget.currency?.code || "—" }}
    </span>
    <span class="mt-0.5 w-full truncate text-center text-[10px] font-medium text-brand-700 tabular-nums">
      {{ utilizationLabel }}
    </span>
    <span class="mt-0.5 w-full truncate text-center text-[10px] text-gray-500 tabular-nums">
      {{ budget.remainingFormattedCurrencyPrefixed }}
    </span>
  </div>
</template>
