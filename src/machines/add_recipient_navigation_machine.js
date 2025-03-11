import {assign, createMachine} from 'xstate';

export const addRecipientNavigationMachine = createMachine({
    id: 'addRecipient',
    initial: 'targetSelection',
    context: {
        target: null,
        payoutMethod: null,
        recipientType: null,
        canAddIndividual: false,
        canAddBusiness: false,
    },
    states: {
        targetSelection: {
            on: {
                PROCEED: {
                    target: 'payoutMethodSelection',
                    guard: 'targetProvided'
                },
                SET_CONTEXT: {
                    actions: assign({
                        target: ({context, event}) => event.target || context.target
                    })
                }
            }
        },
        payoutMethodSelection: {
            on: {
                PROCEED: {
                    target: 'recipientTypeSelection',
                    guard: 'payoutMethodProvided'
                },
                SET_CONTEXT: {
                    actions: assign({
                        payoutMethod: ({context, event}) => event.payoutMethod || context.payoutMethod
                    })
                }
            }
        },
        recipientTypeSelection: {
            on: {
                PROCEED: [
                    { target: 'addRecipientForm', guard: 'recipientTypeProvided' }
                ],
                SET_CONTEXT: {
                    actions: assign({
                        recipientType: ({context, event}) => event.recipientType || context.recipientType
                    })
                }
            }
        },
        addRecipientForm: {}
    }
}, {
    guards: {
        targetProvided: ({context}) => context.target !== null,
        payoutMethodProvided: ({context}) => context.payoutMethod !== null,
        multipleContextsAvailable: ({context}) => context.canAddIndividual && context.canAddBusiness,
        recipientTypeProvided: ({context}) => context.recipientType !== null
    }
});