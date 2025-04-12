<template>
  <ul role="list" class="divide-y divide-gray-100">
    <template v-for="i in 5" :key="i">
      <div class="flex justify-between gap-x-6 py-5 px-6 sm:px-8 animate-pulse">
        <div class="flex min-w-0 gap-x-4">
          <span class="inline-flex size-11 items-center justify-center border border-1 border-gray-300 rounded-full bg-gray-200"></span>
          <div class="min-w-0 flex-auto">
            <div class="h-4 w-32 bg-gray-200 rounded"></div>
            <div class="mt-3 h-3 w-48 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div class="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
          <div class="mt-1 h-5 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    </template>
  </ul>
</template>