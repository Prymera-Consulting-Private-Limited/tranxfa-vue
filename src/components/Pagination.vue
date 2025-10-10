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
  <nav class="flex items-center justify-between border-t border-gray-200">
    <div class="-mt-px flex w-0 flex-1">
      <a v-if="pagination.links.prev" href="javascript:" @click="pageNumber(props.pagination.current_page - 1)" class="inline-flex items-center border-t-2 border-transparent pt-4 pr-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
        <ArrowLongLeftIcon class="mr-3 size-5 text-gray-400" aria-hidden="true" />
        Previous
      </a>
      <a v-else href="javascript:" class="inline-flex items-center border-t-2 border-transparent pt-4 pr-1 text-sm font-medium text-gray-300 cursor-default">
        <ArrowLongLeftIcon class="mr-3 size-5 text-gray-300" aria-hidden="true" />
        Previous
      </a>
    </div>
    <div class="hidden md:-mt-px md:flex">
      <template v-for="page in pages" :key="page">
        <template v-if="page === '...'">
          <span class="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500">...</span>
        </template>
        <template v-else>
          <a v-if="page === pagination.current_page" href="javascript:" class="inline-flex items-center border-t-2 border-brand-500 px-4 pt-4 text-sm font-medium text-brand-600" aria-current="page">{{ page }}</a>
          <a v-else href="javascript:" @click="pageNumber(page)" class="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">{{ page }}</a>
        </template>

      </template>
    </div>
    <div class="-mt-px flex w-0 flex-1 justify-end">
      <a v-if="pagination.links.next" href="javascript:"  @click="pageNumber(props.pagination.current_page + 1)" class="inline-flex items-center border-t-2 border-transparent pt-4 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
        Next
        <ArrowLongRightIcon class="ml-3 size-5 text-gray-400" aria-hidden="true" />
      </a>
      <a v-else href="#" class="inline-flex items-center border-t-2 border-transparent pt-4 pl-1 text-sm font-medium text-gray-300">
        Next
        <ArrowLongRightIcon class="ml-3 size-5 text-gray-300" aria-hidden="true" />
      </a>
    </div>
  </nav>
</template>