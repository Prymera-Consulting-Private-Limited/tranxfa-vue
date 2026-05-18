import {createMachine} from 'xstate';
import {useCustomerStore} from "@/stores/customer.js";

const customerStore = useCustomerStore();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

/** Skips email verification UI and mobile number step; mobile is already captured during auth. */
export const onboardingNavigationMachine = createMachine({
    id: 'onboardingNavigation',
    initial: 'bootstrap',
    context: {
    },
    states: {
        bootstrap: {
            always: [
                {
                    target: 'onboardingComplete',
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
                },
            ],
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
                        target: 'onboardingComplete',
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
                        target: 'onboardingComplete',
                        guard: 'employmentInformationProvided',
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
        countryProvided: () => customerStore.isLoaded &&
            ((customer.data?.country || null) !== null),
        employmentInformationRequired: () => customerStore.isLoaded &&
            ((customer.data?.country || null) !== null) &&
            ((customer.data?.identityInformationRequired?.() ?? false) === false) &&
            ((customer.data?.employmentInformationRequired?.() ?? false) === true),
        employmentInformationProvided: () => customerStore.isLoaded &&
            ((customer.data?.country || null) !== null) &&
            ((customer.data?.identityInformationRequired?.() ?? false) === false) &&
            ((customer.data?.employmentInformationRequired?.() ?? false) === false),
    }
});
