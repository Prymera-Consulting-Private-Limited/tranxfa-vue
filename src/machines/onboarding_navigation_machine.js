import { createMachine } from 'xstate';
import { useCustomerStore } from '@/stores/customer.js';
import { addressCollection, collectsAddress, verifiesMobileNumber } from '@/onboarding_config.js';

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

// Reads "the address no longer stands between the customer and the next step".
//
// Not the same as "an address was given": a deployment that omits the step is
// settled by definition, and so is one where the step is skippable - otherwise
// every later step, which all chain through this, would be unreachable for a
// customer who skipped.
function addressSettled() {
    const customer = getCustomer();

    if (addressCollection() !== 'required') {
        return employmentInformationCompleted();
    }

    return employmentInformationCompleted() &&
        !customer?.addressInformationRequired?.();
}

function hasMobileNumber() {
    const customer = getCustomer();

    return addressSettled() &&
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
                    // Address is offered before mobile. The other two entry
                    // points already order it this way; this one did not, and
                    // in `optional` mode that difference decides whether the
                    // step is ever seen - addressSettled() is true from the
                    // start when the customer may skip, so a mobileNumberInput
                    // branch placed first swallows the step entirely. quiqsend
                    // hit this and reordered by hand on its branch.
                    {
                        target: 'addressInformation',
                        guard: requiresAddressInformation,
                    },
                    {
                        target: 'mobileNumberInput',
                        guard: addressSettled,
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
                        guard: addressSettled,
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
                        guard: addressSettled,
                    },
                ],

                EDIT_PERSONAL_INFORMATION: {
                    target: 'identityInformation',
                },
            },
        },

        addressInformation: {
            on: {
                // In `optional` mode this fires on Skip as well as on Save:
                // addressSettled() does not ask whether an address was given,
                // only whether one still stands in the way.
                PROCEED: [
                    {
                        target: 'onboardingComplete',
                        guard: hasMobileNumber,
                    },
                    {
                        target: 'mobileNumberInput',
                        guard: addressSettled,
                    },
                ],

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
