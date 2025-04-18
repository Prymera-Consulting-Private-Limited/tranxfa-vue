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
                        guard: 'mobileNumberProvided',
                    },
                    {
                        target: 'mobileNumberInput',
                        guard: 'identityInformationProvided',
                    },
                    {
                        target: 'identityInformation',
                        guard: 'countryProvided',
                    },
                    {
                        target: 'sourceCountrySelection',
                        guard: 'emailVerified',
                    }
                ],
            },
        },
        sourceCountrySelection: {
            on: {
                PROCEED: [
                    {
                        target: 'identityInformation',
                        guard: 'countryProvided',
                    },
                ],
            },
        },
        identityInformation: {
            on: {
                PROCEED: [
                    {
                        target: 'mobileNumberInput',
                        guard: 'identityInformationProvided',
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
                        guard: 'mobileNumberProvided',
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
}, {
    guards: {
        emailVerified: () => customerStore.isLoaded && (customer.data?.account?.isEmailVerified || false) === true,
        countryProvided: () =>  customerStore.isLoaded && ((customer.data?.country || null) !== null),
        identityInformationProvided: () =>  customerStore.isLoaded && (customer.data?.identityInformationRequired?.() === false),
        mobileNumberProvided: () =>  customerStore.isLoaded && (customer.data?.account?.mobileNumber || null) !== null,
    }
});