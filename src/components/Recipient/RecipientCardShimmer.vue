<script setup>
</script>

<template>
  <div class="flex flex-1 flex-col p-8 animate-pulse">
    <div :class="[`bg-gray-300`]" class="flex items-center justify-center mx-auto size-10 shrink-0 rounded-full text-white tracking-wider text-sm">
      <span><span class="inline-block w-2 h-2 bg-white"></span></span>
    </div>
    <h3 class="mt-6 text-sm font-medium">
      <span class="inline-block w-32 h-4 bg-gray-300"></span>
    </h3>
    <dl class="mt-1 flex grow flex-col justify-between">
      <dd class="text-gray-500 text-sm"><span class="inline-block w-36 h-2 bg-gray-300"></span></dd>
      <dd class="text-gray-500 text-sm leading-5"><span class="inline-block w-32 h-2 bg-gray-300"></span></dd>
      <dd class="mt-3">
        <span class="inline-block w-24 h-4 bg-gray-300"></span>
      </dd>
    </dl>
  </div>
</template>