import {assign, createMachine} from 'xstate';
export const loginNavigationMachine = createMachine({
    id: 'loginNavigation',
    initial: 'login',
    context: {
        isEmailVerified: false,
        identityInfoProvided: false,
    },
    states: {
        login: {
            on: {
                PROCEED: [
                    { target: "emailVerification", guard: "emailVerificationRequired" },
                    { target: "updateIdentityInformation", guard: "identityInformationRequired" },
                    { target: "dashboard" },
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
        emailVerification: {},
        updateIdentityInformation: {},
        dashboard: {},
    }
}, {
    guards: {
        emailVerificationRequired: ({context}) => ! context.isEmailVerified,
        identityInformationRequired: ({context}) => ! context.identityInfoProvided
    }
});