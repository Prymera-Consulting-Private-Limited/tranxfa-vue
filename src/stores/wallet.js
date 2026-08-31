import { defineStore } from 'pinia';
import {computed, reactive, ref} from "vue";
import WalletAvailability from "@/enums/wallet_availability.js";

export const useWalletStore = defineStore('wallet', () => {
    const availability = ref(WalletAvailability.UNKNOWN);
    const subscription = reactive({
        data: null,
    });
    const wallet = reactive({
        data: null,
    });

    const isAvailable = computed(() => [
        WalletAvailability.ELIGIBLE,
        WalletAvailability.ACTIVE,
        WalletAvailability.PAUSED,
    ].includes(availability.value));

    const isEnrolled = computed(() => [
        WalletAvailability.ACTIVE,
        WalletAvailability.PAUSED,
    ].includes(availability.value));

    const requiresReacceptance = computed(() => availability.value === WalletAvailability.PAUSED);

    return {
        availability,
        subscription,
        wallet,
        isAvailable,
        isEnrolled,
        requiresReacceptance,
    }
});
