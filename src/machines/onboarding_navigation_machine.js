import {assign, createMachine} from 'xstate';
export const onboardingNavigationMachine = createMachine({
    id: 'onboardingNavigation',
    initial: 'emailVerification',
    context: {
        isEmailVerified: false,
        identityInfoProvided: false,
    },
    states: {
        emailVerification: {
            on: {
                PROCEED: [
                    { target: "updateIdentityInformation", guard: "identityInformationRequired" },
                    { target: "dashboard", guard: "onboardingOk" },
                ],
                SET_CONTEXT: {
                    actions: assign({
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
        updateIdentityInformation: {},
        dashboard: {},
    }
}, {
    guards: {
        identityInformationRequired: ({context}) => ! context.identityInfoProvided && context.isEmailVerified,
        onboardingOk: ({context}) => context.identityInfoProvided && context.isEmailVerified
    }
});