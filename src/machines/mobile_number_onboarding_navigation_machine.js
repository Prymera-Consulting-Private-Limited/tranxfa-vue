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

function requiresAddressInformation() {
    const customer = getCustomer();

    return employmentInformationCompleted() &&
        !!customer?.addressInformationRequired?.();
}

function hasEmail() {
    const customer = getCustomer();

    return !!customer?.account?.email;
}

function doesNotHaveEmail() {
    const customer = getCustomer();

    // Address may be skipped during onboarding and collected later when sending money.
    return employmentInformationCompleted() &&
        !customer?.account?.email;
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
                    // Returning users who finished onboarding (e.g. skipped address) go to dashboard.
                    {
                        target: 'onboardingComplete',
                        guard: () => employmentInformationCompleted() && emailVerified(),
                    },
                    {
                        target: 'addressInformation',
                        guard: requiresAddressInformation,
                    },
                    {
                        target: 'emailInput',
                        guard: doesNotHaveEmail,
                    },
                    {
                        target: 'emailVerification',
                        guard: emailVerificationRequired,
                    },
                    {
                        target: 'onboardingComplete',
                        guard: emailVerified,
                    },
                ],
            },
        },

        employmentInformation: {
            on: {
                PROCEED: [
                    // Returning users who finished onboarding (e.g. skipped address) go to dashboard.
                    {
                        target: 'onboardingComplete',
                        guard: () => employmentInformationCompleted() && emailVerified(),
                    },
                    {
                        target: 'addressInformation',
                        guard: requiresAddressInformation,
                    },
                    {
                        target: 'emailInput',
                        guard: doesNotHaveEmail,
                    },
                    {
                        target: 'emailVerification',
                        guard: emailVerificationRequired,
                    },
                    {
                        target: 'onboardingComplete',
                        guard: emailVerified,
                    },
                ],

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                },
            },
        },

        addressInformation: {
            on: {
                PROCEED: [
                    {
                        target: 'emailInput',
                        guard: doesNotHaveEmail,
                    },
                    {
                        target: 'emailVerification',
                        guard: emailVerificationRequired,
                    },
                    {
                        target: 'onboardingComplete',
                        guard: emailVerified,
                    },
                ],

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
