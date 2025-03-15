import {createMachine} from 'xstate';
import {useCustomerStore} from "@/stores/customer.js";

const customerStore = useCustomerStore();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

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
                    guard: () => customerStore.isLoaded && customer.data?.account?.isEmailVerified === true,
                },
            ],
        },
        sourceCountrySelection: {
            always: [
                {
                    target: 'identityInformation',
                    guard: () => customerStore.isLoaded && customer.data?.country,
                },
            ],
        },
        identityInformation: {
            final: true,
        }
    }
});