<script setup>
import MonthlyBudget from "@/models/monthly_budget.js";
import { computed } from "vue";
import { ArrowRightIcon } from "@heroicons/vue/20/solid";

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

const tone = computed(() => {
  const value = utilizationValue.value;
  if (value >= 90) return "danger";
  if (value >= 70) return "warning";
  return "brand";
});

const accentBarClass = computed(() => ({
  brand: "bg-gradient-to-r from-brand-500 to-teal-500",
  warning: "bg-gradient-to-r from-amber-400 to-orange-500",
  danger: "bg-gradient-to-r from-red-500 to-rose-600",
}[tone.value]));

const progressClass = computed(() => ({
  brand: "bg-brand-600",
  warning: "bg-amber-500",
  danger: "bg-red-500",
}[tone.value]));

const badgeClass = computed(() => ({
  brand: "bg-brand-50 text-brand-800 ring-brand-600/15",
  warning: "bg-amber-50 text-amber-900 ring-amber-600/20",
  danger: "bg-red-50 text-red-800 ring-red-600/20",
}[tone.value]));
</script>

<template>
  <article
    class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-200/80 hover:shadow-md"
  >
    <div :class="['absolute inset-x-0 top-0 h-1', accentBarClass]" aria-hidden="true" />

    <div class="flex items-start justify-between gap-3 pt-1">
      <div class="flex min-w-0 items-center gap-3">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-lg font-semibold text-gray-800 ring-1 ring-gray-100"
        >
          {{ budget.currency?.iconUnicode || "¤" }}
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-gray-900">
            {{ budget.currency?.code || "—" }}
          </p>
          <p class="truncate text-xs text-gray-500">
            {{ budget.currency?.commonName || "Monthly limit" }}
          </p>
        </div>
      </div>
      <span
        :class="badgeClass"
        class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset tabular-nums"
      >
        {{ utilizationLabel }}
      </span>
    </div>

    <p class="mt-4 text-xl font-bold tracking-tight text-gray-900 tabular-nums">
      {{ budget.budgetFormattedCurrencyPrefixed }}
    </p>

    <div class="mt-3">
      <div class="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          :class="[progressClass, 'h-full rounded-full transition-all duration-500 ease-out']"
          :style="{ width: `${utilizationValue}%` }"
          role="progressbar"
          :aria-valuenow="utilizationValue"
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
    </div>

    <dl class="mt-4 grid grid-cols-2 gap-3 text-xs">
      <div class="rounded-lg bg-gray-50 px-2.5 py-2">
        <dt class="text-gray-500">Spent</dt>
        <dd class="mt-0.5 font-semibold text-gray-900 tabular-nums">
          {{ budget.spentFormattedCurrencyPrefixed }}
        </dd>
      </div>
      <div class="rounded-lg bg-brand-50/80 px-2.5 py-2">
        <dt class="text-brand-700/80">Remaining</dt>
        <dd class="mt-0.5 font-semibold text-brand-800 tabular-nums">
          {{ budget.remainingFormattedCurrencyPrefixed }}
        </dd>
      </div>
    </dl>

    <p
      class="mt-4 flex items-center gap-1 text-xs font-medium text-brand-700 opacity-0 transition group-hover:opacity-100"
    >
      View details
      <ArrowRightIcon class="size-3.5" aria-hidden="true" />
    </p>
  </article>
</template>
