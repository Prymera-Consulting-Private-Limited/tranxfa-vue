import { createMachine } from 'xstate';
import { useCustomerStore } from '@/stores/customer.js';

const customerStore = useCustomerStore();

function getCustomer() {
    return customerStore.customer?.data;
}

function isLoaded() {
    return customerStore.isLoaded;
}

function isEmailVerified() {
    const customer = getCustomer();

    return isLoaded() &&
        !!customer?.account?.isEmailVerified;
}

function hasEmail() {
    const customer = getCustomer();

    return isLoaded() &&
        !!customer?.account?.email;
}

function emailVerificationRequired() {
    return hasEmail() &&
        !isEmailVerified();
}

function hasCountry() {
    const customer = getCustomer();

    return isEmailVerified() &&
        !!customer?.country;
}

function requiresIdentityInformation() {
    const customer = getCustomer();

    return isEmailVerified() &&
        !!customer?.identityInformationRequired?.();
}

function requiresEmploymentInformation() {
    const customer = getCustomer();

    return hasCountry() &&
        !requiresIdentityInformation() &&
        !!customer?.employmentInformationRequired?.();
}

function employmentInformationCompleted() {
    const customer = getCustomer();

    return hasCountry() &&
        !requiresIdentityInformation() &&
        !customer?.employmentInformationRequired?.();
}

function hasMobileNumber() {
    const customer = getCustomer();

    return employmentInformationCompleted() &&
        !!customer?.account?.mobileNumber;
}

export const onboardingNavigationMachine = createMachine({
    id: 'onboardingNavigation',
    initial: 'emailVerification',

    states: {
        emailVerification: {
            on: {
                PROCEED: [
                    {
                        target: 'onboardingComplete',
                        guard: hasMobileNumber,
                    },
                    {
                        target: 'mobileNumberInput',
                        guard: employmentInformationCompleted,
                    },
                    {
                        target: 'employmentInformation',
                        guard: requiresEmploymentInformation,
                    },
                    {
                        target: 'identityInformation',
                        guard: hasCountry,
                    },
                    {
                        target: 'sourceCountrySelection',
                        guard: isEmailVerified,
                    },
                ],
                EDIT_EMAIL: {
                    target: 'emailInput',
                },
            },
        },

        emailInput: {
            on: {
                PROCEED: [
                    {
                        target: 'emailVerification',
                        guard: emailVerificationRequired,
                    },
                    {
                        target: 'sourceCountrySelection',
                        guard: isEmailVerified,
                    },
                ],
            },
        },

        sourceCountrySelection: {
            on: {
                PROCEED: {
                    target: 'identityInformation',
                    guard: hasCountry,
                },
            },
        },

        identityInformation: {
            on: {
                PROCEED: [
                    {
                        target: 'employmentInformation',
                        guard: requiresEmploymentInformation,
                    },
                    {
                        target: 'mobileNumberInput',
                        guard: employmentInformationCompleted,
                    },
                ],

                CHANGE_COUNTRY: {
                    target: 'sourceCountrySelection',
                },
            },
        },

        employmentInformation: {
            on: {
                PROCEED: {
                    target: 'mobileNumberInput',
                    guard: employmentInformationCompleted,
                },

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                },
            },
        },

        mobileNumberInput: {
            on: {
                PROCEED: {
                    target: 'onboardingComplete',
                    guard: hasMobileNumber,
                },

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                },
            },
        },

        onboardingComplete: {
            type: 'final',
        },
    },
});