<script setup>
import FlagIcon from "vue3-flag-icons";

defineProps({
  targets: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits([
  'recipient:targetSelected',
]);

const targetSelected = (target) => {
  emit('recipient:targetSelected', target);
}

</script>

<template>
  <div>
    <h2 class="text-base font-semibold text-gray-900">Select Recipient Country</h2>
    <p class="mt-1 text-sm text-gray-500">Choose the country of the recipient from the list below.</p>
    <ul role="list" class="mt-0 grid grid-cols-1 gap-6 py-6">
      <li class="flow-root" v-for="(target, index) in targets" :key="index">
        <a href="javascript:" @click="targetSelected(target)" class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-0 hover:bg-gray-50">
          <div :class="['flex size-12 shrink-0 items-center justify-center rounded-lg']">
            <FlagIcon :class="['text-3xl']" :code="target.country.iso2Alpha.toLowerCase()" circle  />
          </div>
          <div class="tracking-wider">
            <h3 class="text-sm font-medium text-gray-900">
              <a href="#" class="focus:outline-hidden">
                <span class="absolute inset-0" aria-hidden="true" />
                <span>{{ target.currency.isoAlpha }} - {{ target.country.commonName }}</span>
              </a>
            </h3>
            <p class="mt-0 text-sm text-gray-500">
              {{ target.currency.endonym ?? target.currency.officialName }}
            </p>
          </div>
        </a>
      </li>
    </ul>
  </div>
</template>