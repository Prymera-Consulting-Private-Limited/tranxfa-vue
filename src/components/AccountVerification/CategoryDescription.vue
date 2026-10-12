<script setup>
import DocumentCategory from "@/models/document_category.js";

defineProps({
  category: DocumentCategory
})
</script>
<template>
  <p v-if="category.code === 'POI'" class="text-gray-500 text-sm/6 mb-3">{{ $t('verification.identityCategoryHint') }}</p>

  <p v-else-if="category.code === 'POA'" class="text-gray-500 text-sm/6 mb-3">{{ $t('verification.addressCategoryHint') }}</p>

  <p v-else-if="category.code === 'SOF'" class="text-gray-500 text-sm/6 mb-3">{{ $t('verification.fundsCategoryHint') }}</p>

  <p v-else class="text-gray-500 text-sm/6 mb-3">{{ $t('verification.otherCategoryHint') }}</p>
</template>