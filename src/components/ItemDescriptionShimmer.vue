<template>
  <dl class="mt-6 divide-y divide-gray-100 text-sm/6">
    <div v-for="i in 3" class="py-6 sm:flex">
      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
        <div class="block w-48 h-2 animate-pulse bg-gray-400"></div>
      </dt>
      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
        <div class="text-gray-900">
          <div class="block w-72 h-2 animate-pulse bg-gray-300"></div>
          <div class="block mt-1 w-64 h-2 animate-pulse bg-gray-200"></div>
          <div class="block mt-1 w-64 h-2 animate-pulse bg-gray-200"></div>
        </div>
      </dd>
    </div>
  </dl>
</template>
<script setup>
</script>