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
            on: {
                PROCEED: [
                    {
                        target: 'onboardingComplete',
                        guard: () => customerStore.isLoaded && (customer.data?.account?.mobileNumber || null) !== null,
                    },
                    {
                        target: 'mobileNumberInput',
                        guard: () => customerStore.isLoaded && (customer.data?.identityInformationRequired() || true) === false,
                    },
                    {
                        target: 'identityInformation',
                        guard: () => (customerStore.isLoaded && customer.data?.country || null) !== null && (customer.data?.account?.isEmailVerified || false) === true,
                    },
                    {
                        target: 'sourceCountrySelection',
                        guard: () => customerStore.isLoaded && (customer.data?.account?.isEmailVerified || false) === true,
                    }
                ],
            },
        },
        sourceCountrySelection: {
            on: {
                PROCEED: [
                    {
                        target: 'identityInformation',
                        guard: ({context}) => (customerStore.isLoaded && customer.data?.country || null) !== null,
                    },
                ],
            },
        },
        identityInformation: {
            on: {
                PROCEED: [
                    {
                        target: 'mobileNumberInput',
                        guard: () => customerStore.isLoaded && customer.data?.identityInformationRequired() === false,
                    },
                ],
                CHANGE_COUNTRY: {
                    target: 'sourceCountrySelection',
                }
            },
        },
        mobileNumberInput: {
            on: {
                PROCEED: [
                    {
                        target: 'onboardingComplete',
                        guard: () => customerStore.isLoaded && customer.data?.account?.mobileNumber,
                    },
                ],
                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                }
            },
        },
        onboardingComplete: {
            final: true,
        },
    }
});