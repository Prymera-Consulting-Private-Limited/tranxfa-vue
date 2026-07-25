<script setup>
import {computed} from 'vue';
import {ChevronLeftIcon, ChevronRightIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  page: {
    type: Number,
    required: true,
  },

  pageCount: {
    type: Number,
    required: true,
  },

  total: {
    type: Number,
    default: 0,
  },

  perPage: {
    type: Number,
    default: 10,
  },
});

const emit = defineEmits([
  'update:page',
]);

const from = computed(() => (props.page - 1) * props.perPage + 1);

const to = computed(() => Math.min(props.page * props.perPage, props.total));

/**
 * A region can come back with 25 pages, so only the ends and the current
 * neighbourhood are listed and the gaps become an ellipsis.
 *
 * @returns {Array<number|string>}
 */
const pages = computed(() => {
  if (props.pageCount <= 7) {
    return Array.from({length: props.pageCount}, (_, index) => index + 1);
  }

  const first = Math.max(2, props.page - 1);
  const last = Math.min(props.pageCount - 1, props.page + 1);

  const items = [1];

  if (first > 2) {
    items.push('start-gap');
  }

  for (let page = first; page <= last; page++) {
    items.push(page);
  }

  if (last < props.pageCount - 1) {
    items.push('end-gap');
  }

  items.push(props.pageCount);

  return items;
});

function go(page) {
  if (page < 1 || page > props.pageCount || page === props.page) {
    return;
  }

  emit('update:page', page);
}
</script>

<template>
  <nav v-if="pageCount > 1" class="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Hotel results">
    <p class="text-xs text-gray-500">Showing {{ from }}–{{ to }} of {{ total }} hotel{{ total === 1 ? '' : 's' }}</p>
    <div class="flex items-center gap-1">
      <button
          type="button"
          :disabled="page === 1"
          @click="go(page - 1)"
          class="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
      >
        <ChevronLeftIcon class="size-4" aria-hidden="true" />
      </button>
      <template v-for="item in pages" :key="item">
        <span v-if="typeof item === 'string'" class="px-1 text-sm text-gray-400" aria-hidden="true">…</span>
        <button
            v-else
            type="button"
            @click="go(item)"
            :aria-current="item === page ? 'page' : undefined"
            :class="[
              item === page
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:text-gray-900',
              'flex size-8 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition',
            ]"
        >{{ item }}</button>
      </template>
      <button
          type="button"
          :disabled="page === pageCount"
          @click="go(page + 1)"
          class="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
      >
        <ChevronRightIcon class="size-4" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>
