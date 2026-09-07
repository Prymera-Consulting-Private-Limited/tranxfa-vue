import { createMachine } from 'xstate';
import { useCustomerStore } from '@/stores/customer.js';
import { collectsAddress } from '@/onboarding_config.js';

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

    return collectsAddress() &&
        employmentInformationCompleted() &&
        !!customer?.addressInformationRequired?.();
}

// Reads "nothing further is owed for the address", so a deployment that does
// not collect one is complete by definition - otherwise the email steps after
// it, which all chain through this, would be unreachable.
function addressInformationCompleted() {
    const customer = getCustomer();

    if (! collectsAddress()) {
        return employmentInformationCompleted();
    }

    return employmentInformationCompleted() &&
        !customer?.addressInformationRequired?.();
}

function hasEmail() {
    const customer = getCustomer();

    return !!customer?.account?.email;
}

function doesNotHaveEmail() {
    const customer = getCustomer();

    return addressInformationCompleted() &&
        ! (!!customer?.account?.email);
}

// Both terminal guards assert the whole prefix, like every other guard here.
// Without that, a customer with a verified email fell past every earlier target
// and reached onboardingComplete with their identity details still incomplete.
function emailVerified() {
    const customer = getCustomer();

    return addressInformationCompleted() &&
        !!customer?.account?.isEmailVerified;
}

// Written out rather than reusing !emailVerified(): now that emailVerified()
// carries the prefix, negating it would read as true whenever the address is
// outstanding and send the customer to verification instead of the address.
function emailVerificationRequired() {
    const customer = getCustomer();

    return addressInformationCompleted() &&
        hasEmail() &&
        !customer?.account?.isEmailVerified;
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
