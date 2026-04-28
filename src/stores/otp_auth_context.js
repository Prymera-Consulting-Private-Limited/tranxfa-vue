import { defineStore } from 'pinia'
import { ref } from 'vue'

/** @typedef {'login' | 'signup'} OtpAuthFlow */

export const useOtpAuthContextStore = defineStore('otpAuthContext', () => {
  /** @type {import('vue').Ref<OtpAuthFlow | null>} */
  const flow = ref(null)
  const country = ref(null)
  const mobile_number = ref(null)

  /**
   * @param {OtpAuthFlow} f
   * @param {string|number|null|undefined} c country id
   * @param {string|null|undefined} m cleaned national mobile
   */
  function setContext(f, c, m) {
    flow.value = f
    country.value = c != null && c !== '' ? String(c) : null
    mobile_number.value = m != null && m !== '' ? String(m) : null
  }

  function clear() {
    flow.value = null
    country.value = null
    mobile_number.value = null
  }

  function isReady() {
    return flow.value != null && country.value != null && mobile_number.value != null
  }

  return { flow, country, mobile_number, setContext, clear, isReady }
})
