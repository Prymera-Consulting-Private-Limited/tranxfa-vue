import { createMachine } from 'xstate';
import { useCustomerStore } from '@/stores/customer.js';
import { addressCollection, collectsAddress } from '@/onboarding_config.js';

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

// Reads "the address no longer stands between the customer and the next step".
//
// Not the same as "an address was given": a deployment that omits the step is
// settled by definition, and so is one where it is skippable - otherwise the
// email steps after it, which all chain through this, would be unreachable for
// a customer who skipped.
function addressSettled() {
    const customer = getCustomer();

    if (addressCollection() !== 'required') {
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

    return addressSettled() &&
        ! (!!customer?.account?.email);
}

// Both terminal guards assert the whole prefix, like every other guard here.
// Without that, a customer with a verified email fell past every earlier target
// and reached onboardingComplete with their identity details still incomplete.
function emailVerified() {
    const customer = getCustomer();

    return addressSettled() &&
        !!customer?.account?.isEmailVerified;
}

// Written out rather than reusing !emailVerified(): now that emailVerified()
// carries the prefix, negating it would read as true whenever the address is
// outstanding and send the customer to verification instead of the address.
function emailVerificationRequired() {
    const customer = getCustomer();

    return addressSettled() &&
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
