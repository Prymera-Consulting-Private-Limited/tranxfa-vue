<script setup>
import FormGroup from "@/components/CustomerAttribute/FormGroup.vue";
import Spinner from "@/components/Spinner.vue";
import {computed, onMounted, reactive, ref, watch} from "vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";

const customerStore = useCustomerStore()
const customerUtils = useCustomerUtils()

const props = defineProps({
  showLoading: {
    type: Boolean,
    required: false,
    default: true,
  },
  categories: {
    type: String,
    required: true,
  },
  updateOutsourced: {
    type: Boolean,
    required: false,
    default: false,
  },
  updateCommandReceived: {
    type: Boolean,
    required: false,
    default: false,
  }
})

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

const form = reactive({
  errors: null,
  data: null,
})

const isSaving = ref(false);

const emit = defineEmits([
  'customer:attribute_category:updated',
  'customer:attribute_category:update_failed',
])

async function update() {
  isSaving.value = true;
  form.errors = null;
  customerUtils.updateProfileAttribute(form.data, props.categories).catch((e) => {
    emit('customer:attribute_category:update_failed', e);
    if (e.status === 422) {
      form.errors = e.response.data.errors;
    } else {
      console.error(e);
    }
  }).then(() => {
    emit('customer:attribute_category:updated');
  });
}

const attributes = computed(() => {
  if (! customer.data) {
    return [];
  }
  const categories = props.categories.split(',');
  return customer.data.attributes.filter((attr) => categories.includes(attr.category));
})

const updateFormData = (attr, value) => {
  form.data[attr.attribute] = value;
}

onMounted(() => {
  form.data = {};
  for (const attribute of attributes.value) {
    form.data[attribute.attribute] = attribute.value;
  }
})

watch(() => props.updateCommandReceived, (value) => {
  if (value) {
    update();
  }
})
</script>

<template>
  <form @submit.prevent="update" class="space-y-6">
    <div v-for="attribute in attributes" :key="attribute.attribute">
      <FormGroup v-on:customer:attribute:updated="updateFormData" v-bind:attr="attribute" />
    </div>
    <button v-if="! updateOutsourced" :disabled="showLoading || isSaving" :class="[{'opacity-70': showLoading || isSaving}]" type="submit" class="block w-full bg-brand-700 text-white text-center py-3 rounded-md font-medium hover:bg-brand-800 transition cursor-pointer">
      <template v-if="isSaving">
        <span class="flex items-center justify-center whitespace-nowrap">
          <Spinner :class="'size-4 mr-2'" />
          Saving ...
        </span>
      </template>
      <template v-else>Continue</template>
    </button>
  </form>
</template>