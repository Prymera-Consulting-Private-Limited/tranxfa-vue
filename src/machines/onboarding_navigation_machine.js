import { createMachine } from 'xstate';
import { useCustomerStore } from '@/stores/customer.js';
import { collectsAddress, verifiesMobileNumber } from '@/onboarding_config.js';

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

function requiresAddressInformation() {
    const customer = getCustomer();

    return collectsAddress() &&
        employmentInformationCompleted() &&
        !!customer?.addressInformationRequired?.();
}

// Reads "nothing further is owed for the address", so a deployment that does
// not collect one is complete by definition - otherwise every later step, which
// all chain through this, would be unreachable.
function addressInformationCompleted() {
    const customer = getCustomer();

    if (! collectsAddress()) {
        return employmentInformationCompleted();
    }

    return employmentInformationCompleted() &&
        !customer?.addressInformationRequired?.();
}

function hasMobileNumber() {
    const customer = getCustomer();

    return addressInformationCompleted() &&
        !!customer?.account?.mobileNumber;
}

function requiresMobileNumberVerification() {
    const customer = getCustomer();

    return verifiesMobileNumber() &&
        hasMobileNumber() &&
        !customer?.account?.isMobileNumberVerified;
}

// The counterpart of isEmailVerified(): the last thing owed before onboarding
// is done. Where the deployment does not verify numbers, having one is the
// whole requirement.
function mobileNumberSettled() {
    const customer = getCustomer();

    if (! verifiesMobileNumber()) {
        return hasMobileNumber();
    }

    return hasMobileNumber() &&
        !!customer?.account?.isMobileNumberVerified;
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
                        guard: mobileNumberSettled,
                    },
                    {
                        target: 'mobileNumberVerification',
                        guard: requiresMobileNumberVerification,
                    },
                    {
                        target: 'mobileNumberInput',
                        guard: addressInformationCompleted,
                    },
                    {
                        target: 'addressInformation',
                        guard: requiresAddressInformation,
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
                        target: 'addressInformation',
                        guard: requiresAddressInformation,
                    },
                    {
                        target: 'mobileNumberInput',
                        guard: addressInformationCompleted,
                    },
                ],

                CHANGE_COUNTRY: {
                    target: 'sourceCountrySelection',
                },
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
                        target: 'mobileNumberInput',
                        guard: addressInformationCompleted,
                    },
                ],

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                },
            },
        },

        addressInformation: {
            on: {
                PROCEED: {
                    target: 'mobileNumberInput',
                    guard: addressInformationCompleted,
                },

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                },
            },
        },

        mobileNumberInput: {
            on: {
                PROCEED: [
                    {
                        target: 'onboardingComplete',
                        guard: mobileNumberSettled,
                    },
                    {
                        target: 'mobileNumberVerification',
                        guard: requiresMobileNumberVerification,
                    },
                ],

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                },
            },
        },

        mobileNumberVerification: {
            on: {
                PROCEED: [
                    {
                        target: 'onboardingComplete',
                        guard: mobileNumberSettled,
                    },
                ],

                EDIT_MOBILE_NUMBER: {
                    target: 'mobileNumberInput',
                },
            },
        },

        onboardingComplete: {
            type: 'final',
        },
    },
});
