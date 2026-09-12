<script setup>
import RecipientListing from "@/components/Transaction/RecipientListing.vue";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import Confirm from "@/components/Transaction/Confirm.vue";
</script>
<template>
  <div>
    <h1>{{ $t('account.wizard') }}</h1>
    <RecipientListing />
    <AddRecipientWizard />
    <Confirm />
  </div>
</template>