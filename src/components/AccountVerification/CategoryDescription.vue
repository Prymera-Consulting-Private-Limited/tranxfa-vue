<script setup>
import DocumentCategory from "@/models/document_category.js";

defineProps({
  category: DocumentCategory
})
</script>
<template>
  <p v-if="category.code === 'POI'" class="text-gray-500 text-sm/6 mb-3">
    Por seguridad y cumplimiento normativo, sube un documento de identidad oficial en vigor. Asegúrate de que los datos coinciden con los de tu perfil.
  </p>

  <p v-else-if="category.code === 'POA'" class="text-gray-500 text-sm/6 mb-3">
    Para verificar tu domicilio, sube una factura de servicios reciente, un extracto bancario o un documento oficial donde aparezcan tu nombre y tu dirección.
  </p>

  <p v-else-if="category.code === 'SOF'" class="text-gray-500 text-sm/6 mb-3">
    Para cumplir con la normativa financiera, sube un documento que acredite el origen de tus fondos: nómina, extracto bancario o declaración de la renta.
  </p>

  <p v-else class="text-gray-500 text-sm/6 mb-3">
    Sube el documento necesario para continuar con tu envío. Asegúrate de que se lee con claridad, está en vigor y coincide con los datos de tu cuenta.
  </p>
</template>