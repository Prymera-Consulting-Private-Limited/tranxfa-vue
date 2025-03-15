import {assign, createMachine} from 'xstate';
import {useCustomerStore} from "@/stores/customer.js";

const customerStore = useCustomerStore();

export const onboardingNavigationMachine = createMachine({
    id: 'onboardingNavigation',
    initial: 'emailVerification',
    context: {

    },
    states: {
        emailVerification: {
            always: [
                {
                    target: 'sourceCountrySelection',
                    guard: () => customerStore.isLoaded && customerStore?.customer?.account?.isEmailVerified === true,
                },
            ],
        },
        sourceCountrySelection: {
            always: [
                {
                    target: 'identityInformation',
                    guard: () => customerStore.isLoaded && customerStore?.customer?.country === null,
                },
            ],
        },
        identityInformation: {
            final: true,
        }
    }
});