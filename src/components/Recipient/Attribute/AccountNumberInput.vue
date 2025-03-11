<script setup>
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";

defineProps({
  id: {
    type: String,
    required: true,
  },
  attribute: {
    type: PayoutChannelAttribute,
    required: true,
  },
})
</script>

<template>
  <slot />
</template>