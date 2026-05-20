import { createMachine } from 'xstate';
import { useCustomerStore } from '@/stores/customer.js';

const customerStore = useCustomerStore();

function getCustomer() {
    return customerStore.customer?.data;
}

function isLoaded() {
    return customerStore.isLoaded;
}

function requiresIdentityInformation() {
    const customer = getCustomer();

    return isLoaded() &&
        !!customer?.identityInformationRequired?.();
}

function requiresEmploymentInformation() {
    const customer = getCustomer();

    return isLoaded() &&
        !requiresIdentityInformation() &&
        !!customer?.employmentInformationRequired?.();
}

function employmentInformationCompleted() {
    return isLoaded() &&
        !requiresIdentityInformation() &&
        !requiresEmploymentInformation();
}

function hasEmail() {
    const customer = getCustomer();

    return !!customer?.account?.email;
}

function emailVerified() {
    const customer = getCustomer();

    return !!customer?.account?.isEmailVerified;
}

function emailVerificationRequired() {
    return hasEmail() &&
        !emailVerified();
}

export const mobileAuthOnboardingMachine = createMachine({
    id: 'mobileAuthOnboarding',

    initial: 'identityInformation',

    states: {
        identityInformation: {
            on: {
                PROCEED: [
                    {
                        target: 'employmentInformation',
                        guard: requiresEmploymentInformation,
                    },
                    {
                        target: 'emailInput',
                        guard: employmentInformationCompleted,
                    },
                ],
            },
        },

        employmentInformation: {
            on: {
                PROCEED: {
                    target: 'emailInput',
                    guard: employmentInformationCompleted,
                },

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
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
                        target: 'onboardingComplete',
                    },
                ],

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                },
            },
        },

        emailVerification: {
            on: {
                PROCEED: [
                    {
                        target: 'onboardingComplete',
                        guard: emailVerified,
                    },
                ],
            },
        },

        onboardingComplete: {
            type: 'final',
        },
    },
});