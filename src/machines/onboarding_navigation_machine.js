import {assign, createMachine} from 'xstate';
export const onboardingNavigationMachine = createMachine({
    id: 'onboardingNavigation',
    initial: 'emailVerification',
    context: {
        isEmailVerified: false,
        accountCountry: null,
        identityInfoProvided: false,
    },
    states: {
        emailVerification: {
            on: {
                PROCEED: [
                    { target: "editAccountCountry", guard: "countryIsMissing" },
                    { target: "updateIdentityInformation", guard: "identityInformationRequired" },
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
                        }
                    })
                }
            },
        },
        editAccountCountry: {},
        updateIdentityInformation: {},
        dashboard: {},
    }
}, {
    guards: {
        countryIsMissing: ({context}) => context.isEmailVerified && ! context.accountCountry,
        identityInformationRequired: ({context}) => ! context.identityInfoProvided && context.isEmailVerified,
        onboardingOk: ({context}) => context.accountCountry && context.identityInfoProvided && context.isEmailVerified
    }
});