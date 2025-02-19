import { defineStore } from 'pinia'
import {computed, ref} from "vue";

export const usePasswordPolicyStore = defineStore('passwordPolicy', () => {
    const isLoaded = ref(false);
    const policy = ref(null);
    const setLoaded = (flag = null) => {
        isLoaded.value = flag || true;
    }
    const setPolicy = (object = null) => {
        policy.value = object || null;
    }
    const rules = computed(() => {
        let rules = [];
        if (isLoaded.value === true) {
            if (policy.value['length']?.value) {
                rules.push({
                    id: 'length',
                    message: policy.value['length'].message || null,
                    regex: policy.value['length'].regex || null,
                    value: policy.value['length'].value,
                })
            }
            if (policy.value?.uppercase?.value) {
                rules.push({
                    id: 'uppercase',
                    message: policy.value.uppercase.message || null,
                    regex: policy.value.uppercase.regex || null,
                })
            }
            if (policy.value?.lowercase?.value) {
                rules.push({
                    id: 'lowercase',
                    message: policy.value.lowercase.message || null,
                    regex: policy.value.lowercase.regex || null,
                })
            }
            if (policy.value?.digits?.value) {
                rules.push({
                    id: 'digits',
                    message: policy.value.digits.message || null,
                    regex: policy.value.digits.regex || null,
                })
            }
            if (policy.value?.wildcard?.value) {
                rules.push({
                    id: 'wildcard',
                    message: policy.value.wildcard.message || null,
                    regex: policy.value.wildcard.regex || null,
                })
            }
        }

        return rules;
    })

    return {
        isLoaded,
        setLoaded,
        setPolicy,
        policy,
        rules,
    }
})