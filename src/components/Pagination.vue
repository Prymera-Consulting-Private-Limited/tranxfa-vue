<script setup>
import {ArrowLongLeftIcon, ArrowLongRightIcon} from "@heroicons/vue/20/solid/index.js";
import {computed} from "vue";

const props = defineProps({
  pagination: Object({
    total_pages: Number,
    current_page: Number
  }),
});
const emit = defineEmits([
    'pageClicked',
]);
const pages = computed(() => {
  if (props.pagination.total_pages < 8) {
    return [...Array(props.pagination.total_pages).keys()].map(i => i + 1);
  } else {
    let visiblePages = [];

    if (props.pagination.current_page <= 4) {
      visiblePages = [1, 2, 3, 4, 5, '...', props.pagination.total_pages];
    } else if (props.pagination.current_page >= props.pagination.total_pages - 3) {
      visiblePages = [1, '...', props.pagination.total_pages - 4, props.pagination.total_pages - 3, props.pagination.total_pages - 2, props.pagination.total_pages - 1, props.pagination.total_pages];
    } else {
      visiblePages = [1, '...', props.pagination.current_page - 1, props.pagination.current_page, props.pagination.current_page + 1, '...', props.pagination.total_pages];
    }

    return visiblePages;
  }
});
async function pageNumber(page) {
  emit('pageClicked', page);
}
</script>
<template>
  <!-- Buttons, not anchors. Every control here used to be an anchor whose href
       was an inline-script URL, which is three problems at once: it is not a
       link, so a screen reader offers a destination that does not exist; the
       inactive prev/next carried no disabled state at all, so "Anterior" on page
       one was announced as an available link; and an inline-script href is
       blocked by a CSP the moment it stops being report-only. This repo's
       script-src has no 'unsafe-inline', so that is not hypothetical.

       The page control emits an event. That is a button. -->
  <nav aria-label="Pagination" class="flex items-center justify-between border-t border-gray-200">
    <div class="-mt-px flex w-0 flex-1">
      <button
        type="button"
        :disabled="! pagination.links.prev"
        @click="pageNumber(props.pagination.current_page - 1)"
        class="inline-flex cursor-pointer items-center border-t-2 border-transparent pt-4 pr-1 text-sm/6 font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-default disabled:border-transparent disabled:text-gray-300 disabled:hover:text-gray-300"
      >
        <ArrowLongLeftIcon :class="[pagination.links.prev ? 'text-gray-400' : 'text-gray-300']" class="mr-3 size-5" aria-hidden="true" />
        Anterior
      </button>
    </div>
    <div class="hidden md:-mt-px md:flex">
      <template v-for="(page, index) in pages" :key="`${page}-${index}`">
        <!-- A gap in the sequence, not a page. Nothing to announce. -->
        <span v-if="page === '...'" aria-hidden="true" class="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm/6 font-medium text-gray-500">...</span>
        <button
          v-else
          type="button"
          :aria-current="page === pagination.current_page ? 'page' : undefined"
          :aria-label="`Page ${page}`"
          :disabled="page === pagination.current_page"
          @click="pageNumber(page)"
          :class="[
            page === pagination.current_page
              ? 'cursor-default border-brand-500 text-brand-700'
              : 'cursor-pointer border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
          ]"
          class="inline-flex items-center border-t-2 px-4 pt-4 text-sm/6 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >{{ page }}</button>
      </template>
    </div>
    <div class="-mt-px flex w-0 flex-1 justify-end">
      <button
        type="button"
        :disabled="! pagination.links.next"
        @click="pageNumber(props.pagination.current_page + 1)"
        class="inline-flex cursor-pointer items-center border-t-2 border-transparent pt-4 pl-1 text-sm/6 font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-default disabled:border-transparent disabled:text-gray-300 disabled:hover:text-gray-300"
      >
        Siguiente
        <ArrowLongRightIcon :class="[pagination.links.next ? 'text-gray-400' : 'text-gray-300']" class="ml-3 size-5" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>
