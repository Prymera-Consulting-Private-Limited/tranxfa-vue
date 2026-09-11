<script setup>
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import LoadFailurePanel from "@/components/LoadFailurePanel.vue";
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {computed, onMounted, ref} from "vue";
import {IdentificationIcon} from "@heroicons/vue/24/outline/index.js";
import KycDocumentStatus from "@/enums/kyc_document_status.js";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const isLoading = ref(false);

// The profile's poi_info_check is `failed` when the name or date of birth on
// the identity document differs from what the customer typed. The reference
// says to offer Apply Info From POI on `failed`; until now the customer only
// met it as a refusal at the end of checkout.
const poiMismatch = computed(() => customerStore.customer.data?.poiInfoCheck === 'failed');
const isApplyingPoi = ref(false);
const applyPoiFailure = ref(null);

async function applyInfoFromPoi() {
  isApplyingPoi.value = true;
  applyPoiFailure.value = null;
  try {
    const response = await customerUtils.applyInfoFromPoiDocument();
    customerUtils.updateStore(response.data);
  } catch (e) {
    logRequestFailure(e, 'apply-poi-details');
    applyPoiFailure.value = failureMessage(e, "No pudimos copiar los datos de tu documento. Inténtalo de nuevo o sube otro documento más abajo.");
  } finally {
    isApplyingPoi.value = false;
  }
}
/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

const loadFailure = ref(null);

async function load() {
  if (customerStore.isLoaded) return;
  isLoading.value = true;
  loadFailure.value = null;
  try {
    await customerUtils.refresh();
  } catch (e) {
    logRequestFailure(e, 'verification');
    loadFailure.value = failureMessage(e, "We couldn't load your verification status.");
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Verificación de la cuenta</h1>

        <LoadFailurePanel v-if="loadFailure" title="We couldn't load your verification status" :message="loadFailure" retryLabel="Try again" @retry="load" class="mt-0" />
        <!-- Main 3 column grid -->
        <div v-else class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Verificación de la cuenta</h2>
              <div>
                <h2 class="text-base font-semibold text-gray-900">Verificación única</h2>
                <p class="mt-1 text-sm/6 text-gray-500">Para mantener tu cuenta segura y en regla, solo necesitamos verificar algunos datos. Es un proceso rápido y por única vez; sigue los pasos a continuación para continuar.</p>
                <div v-if="poiMismatch" role="alert" class="mt-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
                  <p class="text-sm/6 font-semibold text-warning-800">El nombre o la fecha de nacimiento de tu documento de identidad no coinciden con tu perfil.</p>
                  <p class="mt-1 text-sm/6 text-warning-800">Podemos actualizar tu perfil para que coincida con tu documento, o puedes subir más abajo un documento que coincida con tu perfil. Las transferencias quedan en espera hasta que se haga una de las dos cosas.</p>
                  <p v-if="applyPoiFailure" class="mt-2 text-sm/6 text-danger-700">{{ applyPoiFailure }}</p>
                  <button type="button" @click="applyInfoFromPoi" :disabled="isApplyingPoi" class="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm/6 font-semibold text-white hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed">{{ isApplyingPoi ? 'Actualizando…' : 'Usar los datos de mi documento' }}</button>
                </div>
                <div class="mt-6 border-t border-b border-gray-200 py-6 w-full">
                  <ul v-if="customerStore.isLoaded === true" role="list" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <template v-if="customer.data?.documents.length > 0">
                      <template v-for="document in customer.data.documents" :key="document.id">
                        <li :class="{
                          'bg-success-400/5  border-success-300': document.statusCode === KycDocumentStatus.APPROVED,
                          'bg-blue-400/5 border-blue-300': document.statusCode === KycDocumentStatus.PENDING_VERIFICATION || document.statusCode === KycDocumentStatus.PROCESSING || document.statusCode === KycDocumentStatus.REVIEW_REQUIRED,
                          'bg-danger-400/5 border-danger-300': document.statusCode === KycDocumentStatus.REJECTED || document.statusCode === KycDocumentStatus.INVALIDATED
                        }" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg border text-center">
                          <div class="flex flex-1 flex-col p-8">
                            <IdentificationIcon :class="{
                            'text-success-700': document.statusCode === KycDocumentStatus.APPROVED,
                            'text-blue-700': document.statusCode === KycDocumentStatus.PENDING_VERIFICATION || document.statusCode === KycDocumentStatus.PROCESSING || document.statusCode === KycDocumentStatus.REVIEW_REQUIRED,
                            'text-danger-700': document.statusCode === KycDocumentStatus.REJECTED || document.statusCode === KycDocumentStatus.INVALIDATED
                          }" class="mx-auto size-16 shrink-0 rounded-full" />
                            <h3 :class="{
                            'text-success-700': document.statusCode === KycDocumentStatus.APPROVED,
                            'text-blue-700': document.statusCode === KycDocumentStatus.PENDING_VERIFICATION || document.statusCode === KycDocumentStatus.PROCESSING || document.statusCode === KycDocumentStatus.REVIEW_REQUIRED,
                            'text-danger-700': document.statusCode === KycDocumentStatus.REJECTED || document.statusCode === KycDocumentStatus.INVALIDATED
                          }" class="mt-6 text-sm/6 font-medium">{{ document.documentCategory.title }}</h3>
                            <dl v-if="document.documentCategory.description" class="mt-1 flex grow flex-col justify-between">
                              <template v-if="document.statusCode === KycDocumentStatus.APPROVED">
                                <dt class="sr-only">Información</dt>
                                <dd class="mt-3 text-sm/6 text-success-700">
                                  <p>Su {{ document.documentType.title }} ha sido verificado correctamente.</p>
                                </dd>
                                <dt class="sr-only">Verificada</dt>
                                <dd class="mt-3 text-sm/6">
                                  <a class="text-success-700 font-semibold">Verificada</a>
                                </dd>
                              </template>
                              <template v-else-if="document.statusCode === KycDocumentStatus.REVIEW_REQUIRED">
                                <dt class="sr-only">Información</dt>
                                <dd class="mt-3 text-sm/6 text-gray-700">
                                  <p>Su <span class="font-semibold">{{ document.documentType.title }}</span> está con nuestro equipo de cumplimiento. Le enviaremos un correo cuando termine. Por ahora no necesita hacer nada más.</p>
                                </dd>
                                <dt class="sr-only">En revisión</dt>
                                <dd class="mt-3 text-sm/6">
                                  <a class="text-blue-700 font-semibold">En revisión</a>
                                </dd>
                              </template>
                              <template v-else-if="document.statusCode === KycDocumentStatus.PENDING_VERIFICATION || document.statusCode === KycDocumentStatus.PROCESSING">
                                <dt class="sr-only">Información</dt>
                                <dd class="mt-3 text-sm/6 text-gray-700">
                                  <p>Su <span class="font-semibold">{{ document.documentType.title }}</span> está siendo verificado.</p>
                                </dd>
                                <dt class="sr-only">Verificando</dt>
                                <dd class="mt-3 text-sm/6">
                                  <a class="text-blue-700 font-semibold">Verificando</a>
                                </dd>
                              </template>
                              <!-- rejected and invalidated cannot be re-decided; the KYC spec's way
                                   forward from either is a new document, so that is what is offered. -->
                              <template v-else-if="document.statusCode === KycDocumentStatus.REJECTED || document.statusCode === KycDocumentStatus.INVALIDATED">
                                <dt class="sr-only">Información</dt>
                                <dd class="mt-3 text-sm/6 text-danger-700">
                                  <p v-if="document.statusCode === KycDocumentStatus.INVALIDATED">Su <span class="font-semibold">{{ document.documentType.title }}</span> fue aceptado, pero esa aceptación se ha retirado.</p>
                                  <p v-else>No pudimos aceptar su <span class="font-semibold">{{ document.documentType.title }}</span>.</p>
                                  <p class="mt-1 text-gray-700">Suba otro documento o una foto más clara de este. Las transferencias quedan en espera hasta que se acepte un documento.</p>
                                </dd>
                                <dt class="sr-only">Siguiente paso</dt>
                                <dd class="mt-3 text-sm/6">
                                  <router-link v-if="document.documentCategory?.id" :to="{name: 'categoryView', params: {category: document.documentCategory.id}}" class="inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm/6 font-semibold text-white hover:bg-brand-800">Subir otro documento</router-link>
                                  <span v-else class="text-danger-700 font-semibold">{{ document.statusTitle || 'No aceptado' }}</span>
                                </dd>
                              </template>
                              <!-- A status this app does not know. The API filters the ones it can produce
                                   and we cannot render, but a blank card is the failure nobody reports. -->
                              <template v-else>
                                <dt class="sr-only">Información</dt>
                                <dd class="mt-3 text-sm/6 text-gray-700">
                                  <p>Your <span class="font-semibold">{{ document.documentType.title }}</span> is marked <span class="font-semibold">{{ document.statusTitle || document.statusCode }}</span>.</p>
                                </dd>
                                <dd class="mt-3 text-sm/6 text-gray-700">
                                  If you are not sure what this means, <router-link :to="{name: 'support'}" class="font-semibold text-brand-700 hover:underline">contact support</router-link> and quote the document name.
                                </dd>
                              </template>
                            </dl>
                          </div>
                        </li>
                      </template>
                    </template>
                    <template  v-if="customer.data?.pendingDocuments.length > 0">
                      <li v-for="pendingCategory in customer.data?.pendingDocuments" :key="pendingCategory.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm">
                        <div class="flex flex-1 flex-col p-8">
                          <IdentificationIcon class="mx-auto size-16 shrink-0 rounded-full text-brand-700" />
                          <h3 class="mt-6 text-sm/6 font-medium text-gray-900">{{ pendingCategory.title }}</h3>
                          <dl v-if="pendingCategory.description" class="mt-1 flex grow flex-col justify-between">
                            <dt class="sr-only">Información</dt>
                            <dd class="mt-3 text-sm/6 text-gray-500">
                              <p>{{ pendingCategory.description }}</p>
                            </dd>
                            <dt class="sr-only">Iniciar verificación</dt>
                            <dd class="mt-3 text-sm/6 text-gray-500">
                              <router-link :to="{name: 'categoryView', params: {category: pendingCategory.id}}" class="text-brand-700 font-semibold hover:underline">Iniciar verificación</router-link>
                            </dd>
                          </dl>
                        </div>
                      </li>
                    </template>
                  </ul>
                  <ul v-else role="list" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <template v-for="i in 3" :key="i">
                      <li class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm animate-pulse">
                        <div class="flex flex-1 flex-col p-8">
                          <div class="mx-auto size-16 shrink-0 rounded-full bg-gray-200"></div>
                          <div class="mt-6 h-4 w-3/4 bg-gray-200 rounded mx-auto"></div>
                          <div class="mt-3 h-3 w-1/2 bg-gray-200 rounded mx-auto"></div>
                          <div class="mt-3 h-3 w-2/3 bg-gray-200 rounded mx-auto"></div>
                          <div class="mt-4 h-5 w-1/2 bg-gray-300 rounded mx-auto"></div>
                        </div>
                      </li>
                    </template>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">

          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>