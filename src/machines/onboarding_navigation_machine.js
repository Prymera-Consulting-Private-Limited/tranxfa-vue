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
                        guard: 'employmentInformationProvided',
                    },
                    {
                        target: 'employmentInformation',
                        guard: 'employmentInformationRequired',
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
                        target: 'employmentInformation',
                        guard: 'employmentInformationRequired',
                    }, {
                        target: 'mobileNumberInput',
                        guard: 'employmentInformationProvided',
                    },
                ],
                CHANGE_COUNTRY: {
                    target: 'sourceCountrySelection',
                }
            },
        },
        employmentInformation: {
            on: {
                PROCEED: [
                    {
                        target: 'mobileNumberInput',
                        guard: 'employmentInformationProvided',
                    },
                ],
                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
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
        emailVerified: () => customerStore.isLoaded &&
            (customer.data?.account?.isEmailVerified ?? false) === true,
        countryProvided: () => customerStore.isLoaded &&
            (customer.data?.account?.isEmailVerified ?? false) === true &&
            ((customer.data?.country || null) !== null),
        identityInformationProvided: () => customerStore.isLoaded &&
            (customer.data?.account?.isEmailVerified ?? false) === true &&
            ((customer.data?.country || null) !== null) &&
            ((customer.data?.identityInformationRequired?.() ?? false) === false),
        employmentInformationRequired: () => customerStore.isLoaded &&
            (customer.data?.account?.isEmailVerified ?? false) === true &&
            ((customer.data?.country || null) !== null) &&
            ((customer.data?.identityInformationRequired?.() ?? false) === false) &&
            ((customer.data?.employmentInformationRequired?.() ?? false) === true),
        employmentInformationProvided: () => customerStore.isLoaded &&
            (customer.data?.account?.isEmailVerified ?? false) === true &&
            ((customer.data?.country || null) !== null) &&
            ((customer.data?.identityInformationRequired?.() ?? false) === false) &&
            ((customer.data?.employmentInformationRequired?.() ?? false) === false),
        mobileNumberProvided: () => customerStore.isLoaded &&
            (customer.data?.account?.isEmailVerified ?? false) === true &&
            ((customer.data?.country || null) !== null) &&
            ((customer.data?.identityInformationRequired?.() ?? false) === false) &&
            ((customer.data?.employmentInformationRequired?.() ?? false) === false) &&
            (customer.data?.account?.mobileNumber || null) !== null,
    }
});