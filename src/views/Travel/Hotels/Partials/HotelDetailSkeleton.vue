<template>
  <div class="animate-pulse space-y-6">
    <!-- Gallery mosaic -->
    <div class="grid h-72 grid-cols-1 grid-rows-1 gap-2 overflow-hidden rounded-3xl sm:h-96 sm:grid-cols-4 sm:grid-rows-2">
      <div class="bg-gray-200 sm:col-span-2 sm:row-span-2" />
      <div v-for="index in 4" :key="index" class="hidden bg-gray-100 sm:block" />
    </div>
    <!-- Heading -->
    <div class="space-y-3">
      <div class="h-6 w-24 rounded-full bg-gray-100" />
      <div class="h-8 w-3/4 rounded bg-gray-200" />
      <div class="h-4 w-1/2 rounded bg-gray-100" />
    </div>
    <!-- Rooms -->
    <div class="space-y-3">
      <div v-for="index in 2" :key="index" class="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
        <div class="space-y-2 px-6 pt-5 pb-4">
          <div class="h-5 w-44 rounded bg-gray-200" />
          <div class="h-3 w-28 rounded bg-gray-100" />
        </div>
        <div v-for="row in 2" :key="row" class="flex items-center gap-6 border-t border-gray-100 px-6 py-4">
          <div class="flex-1 space-y-2">
            <div class="flex gap-2">
              <div class="h-6 w-28 rounded-lg bg-gray-200" />
              <div class="h-6 w-36 rounded-lg bg-gray-100" />
            </div>
            <div class="h-3 w-2/5 rounded bg-gray-100" />
          </div>
          <div class="w-48 shrink-0 space-y-2 border-l border-gray-100 pl-6">
            <div class="ml-auto h-6 w-28 rounded bg-gray-200" />
            <div class="h-10 w-full rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
