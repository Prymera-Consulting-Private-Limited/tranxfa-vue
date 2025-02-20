import {useCustomerStore} from "@/stores/customer.js";
import {computed, ref} from "vue";

export function useOnboardingUtils() {
    const customerStore = useCustomerStore();
    const skipEmailVerification = ref(false);
    const askForEmailVerification = computed(() => {
        return !skipEmailVerification.value && !customerStore.customer?.account?.isEmailVerified;
    });

    const transitions = [
        {
            from: '/',
            to: '/email-verification',
            when: {
                askForEmailVerification: true,
            }
        }, {
            from: '/',
            to: '/identity',
            when: {
                askForEmailVerification: false,
            }
        }, {
            from: '/email-verification',
            to: '/identity',
            when: {
                askForEmailVerification: false,
            }
        }
    ];

    const nextOnboardingRoute = computed(() => {
        return '/identity';
    });

    return {
        skipEmailVerification,
        nextOnboardingRoute,
    };
}