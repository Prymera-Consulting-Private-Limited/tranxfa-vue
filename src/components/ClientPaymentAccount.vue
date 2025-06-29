<script setup>
import {ClipboardIcon} from "@heroicons/vue/24/outline/index.js";
import {UseClipboard} from "@vueuse/components";
import ClientPaymentAccount from "@/models/client_payment_account.js";

defineProps({
  account: Object(ClientPaymentAccount),
})
</script>

<template>
  <div v-for="(accountAttribute, index) in account?.attributes" :key="`account-attribute-${index}`" class="text-left my-5">
    <label :for="`account-attribute-${index}`" class="block text-sm/6 font-medium text-gray-900">{{ accountAttribute.key }}</label>
    <UseClipboard v-slot="{ copy, copied }" :source="accountAttribute.value">
      <div class="mt-2 flex">
        <div class="-mr-px grid grow grid-cols-1 focus-within:relative">
          <input type="text" readonly :value="accountAttribute.value" :id="`account-attribute-${index}`" class="col-start-1 row-start-1 block w-full rounded-l-md bg-gray-50 py-2.5 px-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600 sm:text-sm/6" />
        </div>
        <button @click="copy()" type="button" class="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600 cursor-pointer">
          <ClipboardIcon class="-ml-0.5 size-4 text-gray-400" aria-hidden="true" />
        </button>
      </div>
      <p v-if="copied" class="text-green-600 mt-2 font-normal text-xs">{{ accountAttribute.key }} has been copied!</p>
    </UseClipboard>
  </div>
  <div class="text-left my-5">
    <label :for="`payment-reference`" class="block text-sm/6 font-medium text-gray-900">Payment Reference</label>
    <UseClipboard v-slot="{ copy, copied }" :source="account.paymentReference">
      <div class="mt-2 flex">
        <div class="-mr-px grid grow grid-cols-1 focus-within:relative">
          <input type="text" readonly :value="account.paymentReference" :id="`payment-reference`" class="col-start-1 row-start-1 block w-full rounded-l-md bg-gray-50 py-2.5 px-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600 sm:text-sm/6" />
        </div>
        <button @click="copy()" type="button" class="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600 cursor-pointer">
          <ClipboardIcon class="-ml-0.5 size-4 text-gray-400" aria-hidden="true" />
        </button>
      </div>
      <p v-if="copied" class="text-green-600 mt-2 font-normal text-xs">Payment Reference has been copied!</p>
    </UseClipboard>
  </div>
</template>