<script setup>
import DocumentCategory from "@/models/document_category.js";

defineProps({
  category: DocumentCategory
})
</script>
<template>
  <p v-if="category.code === 'POI'" class="text-gray-500 text-sm mb-3">
    For security and compliance, please upload a valid government-issued ID. Ensure the details match those in your profile.
  </p>

  <p v-else-if="category.code === 'POA'" class="text-gray-500 text-sm mb-3">
    To verify your address, please upload a recent utility bill, bank statement, or government-issued document showing your name and address.
  </p>

  <p v-else-if="category.code === 'SOF'" class="text-gray-500 text-sm mb-3">
    To comply with financial regulations, please upload a document that confirms the source of your funds—such as a payslip, bank statement, or sale agreement.
  </p>

  <p v-else class="text-gray-500 text-sm mb-3">
    Please upload the required document to proceed with your transfer. Make sure it's clear, valid, and matches your account details.
  </p>
</template>