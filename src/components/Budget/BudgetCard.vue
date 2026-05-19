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

const progressTone = computed(() => {
  const value = utilizationValue.value;
  if (value >= 90) return "danger";
  if (value >= 70) return "warning";
  return "brand";
});

const progressBarClass = computed(() => {
  const tones = {
    brand: "bg-brand-600",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };
  return tones[progressTone.value];
});

const badgeClass = computed(() => {
  const tones = {
    brand: "bg-brand-50 text-brand-700 ring-brand-600/20",
    warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
    danger: "bg-red-50 text-red-700 ring-red-600/20",
  };
  return tones[progressTone.value];
});
</script>

<template>
  <article class="flex h-full flex-col px-5 py-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Monthly budget
        </p>
        <p class="mt-1 truncate text-lg font-semibold text-gray-900">
          {{ budget.currency?.commonName || budget.currency?.code || "Budget" }}
        </p>
        <p class="mt-0.5 text-sm text-gray-500">
          <span class="font-medium text-gray-700">{{ budget.currency?.iconUnicode }}</span>
          {{ budget.currency?.code }}
        </p>
      </div>
      <span
        :class="badgeClass"
        class="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
      >
        {{ utilizationLabel }} used
      </span>
    </div>

    <div class="mt-5">
      <p class="text-2xl font-bold tracking-tight text-gray-900 tabular-nums">
        {{ budget.budgetFormattedCurrencyPrefixed }}
      </p>
      <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          :class="progressBarClass"
          class="h-full rounded-full transition-all duration-300"
          :style="{ width: `${utilizationValue}%` }"
          role="progressbar"
          :aria-valuenow="utilizationValue"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${utilizationLabel} of budget used`"
        />
      </div>
    </div>

    <dl class="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm">
      <div>
        <dt class="text-gray-500">Spent</dt>
        <dd class="mt-1 font-semibold text-gray-900 tabular-nums">
          {{ budget.spentFormattedCurrencyPrefixed }}
        </dd>
      </div>
      <div class="text-right">
        <dt class="text-gray-500">Remaining</dt>
        <dd class="mt-1 font-semibold text-brand-700 tabular-nums">
          {{ budget.remainingFormattedCurrencyPrefixed }}
        </dd>
      </div>
    </dl>
  </article>
</template>
