import {assign, createMachine} from 'xstate';
export const onboardingNavigationMachine = createMachine({
    id: 'onboardingNavigation',
    initial: 'emailVerification',
    context: {
        isEmailVerified: false,
        accountCountry: null,
        identityInfoProvided: false,
        mobileNumber: null,
    },
    states: {
        emailVerification: {
            on: {
                PROCEED: [
                    { target: "editAccountCountry", guard: "countryIsMissing" },
                    { target: "updateIdentityInformation", guard: "identityInformationRequired" },
                    { target: "mobileNumberInput", guard: "mobileNumberRequired" },
                    { target: "dashboard", guard: "onboardingOk" },
                ],
                SET_CONTEXT: {
                    actions: assign({
                        accountCountry: ({context, event}) => {
                            return event.accountCountry || context.accountCountry;
                        },
                        isEmailVerified: ({context, event}) => {
                            return event.isEmailVerified || context.isEmailVerified;
                        },
                        identityInfoProvided: ({context, event}) => {
                            return event.identityInfoProvided || context.identityInfoProvided;
                        },
                        mobileNumber: ({context, event}) => {
                            return event.mobileNumber || context.mobileNumber;
                        }
                    })
                }
            },
        },
        editAccountCountry: {
            on: {
                PROCEED: [
                    { target: "emailVerification", guard: "isEmailVerified" },
                    { target: "updateIdentityInformation", guard: "identityInformationRequired" },
                    { target: "mobileNumberInput", guard: "mobileNumberRequired" },
                    { target: "dashboard", guard: "onboardingOk" },
                ],
                SET_CONTEXT: {
                    actions: assign({
                        accountCountry: ({context, event}) => {
                            return event.accountCountry || context.accountCountry;
                        },
                        isEmailVerified: ({context, event}) => {
                            return event.isEmailVerified || context.isEmailVerified;
                        },
                        identityInfoProvided: ({context, event}) => {
                            return event.identityInfoProvided || context.identityInfoProvided;
                        },
                        mobileNumber: ({context, event}) => {
                            return event.mobileNumber || context.mobileNumber;
                        }
                    })
                }
            },
        },
        updateIdentityInformation: {
            on: {
                PROCEED: [
                    { target: "emailVerification", guard: "isEmailVerified" },
                    { target: "editAccountCountry", guard: "countryIsMissing" },
                    { target: "mobileNumberInput", guard: "mobileNumberRequired" },
                    { target: "dashboard", guard: "onboardingOk" },
                ],
                SET_CONTEXT: {
                    actions: assign({
                        accountCountry: ({context, event}) => {
                            return event.accountCountry || context.accountCountry;
                        },
                        isEmailVerified: ({context, event}) => {
                            return event.isEmailVerified || context.isEmailVerified;
                        },
                        identityInfoProvided: ({context, event}) => {
                            return event.identityInfoProvided || context.identityInfoProvided;
                        },
                        mobileNumber: ({context, event}) => {
                            return event.mobileNumber || context.mobileNumber;
                        }
                    })
                }
            },
        },
        mobileNumberInput: {},
        dashboard: {},
    }
}, {
    guards: {
        countryIsMissing: ({context}) => context.isEmailVerified && ! context.accountCountry,
        identityInformationRequired: ({context}) => ! context.identityInfoProvided && context.accountCountry && context.isEmailVerified,
        mobileNumberRequired: ({context}) => context.identityInfoProvided && context.isEmailVerified && context.accountCountry && ! context.mobileNumber,
        onboardingOk: ({context}) => context.accountCountry && context.identityInfoProvided && context.isEmailVerified && context.mobileNumber
    }
});