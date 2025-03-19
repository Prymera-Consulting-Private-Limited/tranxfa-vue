import { assign, createMachine } from 'xstate';

export const transactionNavigationMachine = createMachine({
    id: 'moneyTransfer',
    initial: 'checkRecipients',
    context: {
        quote: null,
    },
    states: {
        checkRecipients: {
            always: [
                {
                    target: 'selectRecipient',
                    guard: ({context}) => context.quote?.recipients?.length > 0,
                },
                {
                    target: 'addRecipient',
                },
            ],
            SET_CONTEXT: {
                actions: assign({
                    quote: ({context, event}) => event.quote || context.quote
                })
            },
        },
        addRecipient: {
            PROCEED: [
                {
                    target: 'confirm',
                    guard: ({context}) => context.quote?.recipient !== null,
                },
            ],
            SET_CONTEXT: {
                actions: assign({
                    quote: ({context, event}) => event.quote || context.quote
                })
            },
        },
        selectRecipient: {
            PROCEED: [
                {
                    target: 'confirm',
                    guard: ({context}) => context.quote?.recipient !== null,
                },
            ],
            SET_CONTEXT: {
                actions: assign({
                    quote: ({context, event}) => event.quote || context.quote
                })
            },
        },
        confirm: {
            type: 'final',
            entry: (context, event) => {
                console.error('Final state reached:', event?.data);
            },
        },
        error: {
            type: 'final',
            entry: (context, event) => {
                console.error('Error state reached:', event?.data);
            },
        },
    },
});