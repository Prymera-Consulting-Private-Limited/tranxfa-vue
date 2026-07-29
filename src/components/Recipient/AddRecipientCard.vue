<template>
  <div class="flex flex-1 flex-col p-8">
    <div class="flex items-center justify-center mx-auto  shrink-0 rounded-full text-white tracking-wider text-sm">
      <PlusCircleIcon class="size-10 text-gray-300" />
    </div>
    <h3 class="mt-6 text-sm font-medium text-gray-900">Agregar nuevo destinatario</h3>
    <dl class="mt-1 flex grow flex-col justify-between">
      <dd class="text-gray-500 text-sm text-center">
        Haz clic aquí para añadir un nuevo destinatario a tu lista.
        <slot />
      </dd>
    </dl>
  </div>
</template>
<script setup>
import {PlusCircleIcon} from "@heroicons/vue/24/outline";
</script>