import {assign, createMachine} from 'xstate';

export const addRecipientNavigationMachine = createMachine({
    id: 'addRecipient',
    initial: 'targetSelection',
    context: {
        target: null,
        payoutMethod: null,
        recipientType: null,
    },
    states: {
        targetSelection: {
            on: {
                PROCEED: {
                    target: 'payoutMethodSelection',
                    guard: ({context}) => context.target !== null
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
                    guard: ({context}) => context.payoutMethod !== null
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
                    {
                        target: 'addRecipientForm',
                        guard: ({context}) => context.recipientType !== null
                    }
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
});