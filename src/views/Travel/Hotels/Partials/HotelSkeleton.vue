<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white animate-pulse">
    <div class="grid grid-cols-1 lg:grid-cols-12">
      <!-- Photo -->
      <div class="h-52 bg-gray-200 lg:col-span-3" />
      <!-- Details -->
      <div class="space-y-4 p-5 lg:col-span-6">
        <!-- Heading -->
        <div class="space-y-2">
          <div class="h-3 w-20 rounded bg-gray-100" />
          <div class="h-5 w-2/3 rounded bg-gray-200" />
          <div class="h-4 w-1/2 rounded bg-gray-100" />
        </div>
        <!-- Room -->
        <div class="space-y-2">
          <div class="h-3 w-12 rounded bg-gray-100" />
          <div class="h-4 w-2/5 rounded bg-gray-200" />
        </div>
        <!-- Rate Highlights -->
        <div class="flex flex-wrap gap-2">
          <div v-for="i in 2" :key="i" class="h-6 w-28 rounded-lg bg-gray-200" />
        </div>
        <!-- Amenities -->
        <div class="h-3 w-3/4 rounded bg-gray-100" />
      </div>
      <!-- Price -->
      <div class="flex flex-col justify-between gap-4 border-t border-gray-100 bg-gray-50/70 p-5 lg:col-span-3 lg:border-t-0 lg:border-l">
        <div class="space-y-2">
          <div class="h-3 w-12 rounded bg-gray-100" />
          <div class="h-7 w-32 rounded bg-gray-200" />
          <div class="h-3 w-28 rounded bg-gray-100" />
        </div>
        <div class="h-10 rounded-lg bg-gray-200" />
      </div>
    </div>
  </div>
</template>
