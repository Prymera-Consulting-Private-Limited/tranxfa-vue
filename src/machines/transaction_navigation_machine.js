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
                    target: 'confirm',
                    guard: (context) => context?.quote?.recipients?.length === 0,
                },
                {
                    target: 'selectRecipient',
                },
            ],
        },
        selectRecipient: {
            on: {
                SELECT_EXISTING_RECIPIENT: 'confirm',
                ADD_NEW_RECIPIENT: 'confirm',
            },
        },
        // addRecipient: {
        //     invoke: {
        //         src: 'addRecipientWizard',
        //         onDone: {
        //             target: 'updateQuoteWithRecipient'
        //         },
        //         onError: {
        //             target: 'error',
        //         },
        //     },
        // },
        // updateQuoteWithRecipient: {
        //     invoke: {
        //         src: 'updateQuoteRecipient',
        //         onDone: {
        //             target: 'confirm',
        //             actions: assign({
        //                 quote: (context, event) => event.data,
        //             }),
        //         },
        //         onError: {
        //             target: 'error',
        //         },
        //     },
        // },
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