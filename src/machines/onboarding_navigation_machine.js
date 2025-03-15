import {createMachine} from 'xstate';
import {useCustomerStore} from "@/stores/customer.js";

const customerStore = useCustomerStore();

/**
 * @type {Customer|null}
 */
const customer = customerStore.customer.data;

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
                    guard: () => customerStore.isLoaded && customer?.account?.isEmailVerified === true,
                },
            ],
        },
        sourceCountrySelection: {
            always: [
                {
                    target: 'identityInformation',
                    guard: () => customerStore.isLoaded && customer?.country === null,
                },
            ],
        },
        identityInformation: {
            final: true,
        }
    }
});