<script setup>
import {RouterLink} from "vue-router";
import BrandLogo from "@/components/BrandLogo.vue";
import {ArrowLeftIcon} from "@heroicons/vue/24/outline";

// Deliberately outside CustomerLayout: a typo in the address bar should read
// the same whether or not the customer is signed in, and the layout would
// start probing the profile and wallet for a page that does not exist.
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16">
    <BrandLogo class="h-10" />
    <p class="mt-10 text-xs/5 font-semibold tracking-wide text-brand-700 uppercase">{{ $t('notFound.eyebrow') }}</p>
    <h1 class="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{{ $t('notFound.title') }}</h1>
    <p class="mt-3 max-w-md text-center text-sm/6 text-gray-600">{{ $t('notFound.body') }}</p>
    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <RouterLink :to="{name: 'dashboard'}" class="inline-flex items-center gap-x-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
        <ArrowLeftIcon class="size-4" aria-hidden="true" />
        {{ $t('notFound.backToDashboard') }}
      </RouterLink>
    </div>
  </div>
</template>
