import { assign, createMachine } from 'xstate';

export const transactionNavigationMachine = createMachine({
    id: 'moneyTransfer',
    initial: 'generatedQuote',
    context: {
        quote: null,
        recipients: [],
        selectedRecipient: null,
    },
    states: {
        generatedQuote: {
            invoke: {
                src: 'generatedTransactionQuote',
                onDone: {
                    target: 'checkRecipients',
                    actions: assign({
                        quote: (context, event) => event.data,
                        recipients: (context, event) => event.data.recipients,
                    }),
                },
                onError: {
                    target: 'error',
                },
            },
        },
        checkRecipients: {
            always: [
                {
                    target: 'addRecipient',
                    guard: (context) => context.recipients.length === 0,
                },
                {
                    target: 'selectRecipient',
                },
            ],
        },
        selectRecipient: {
            on: {
                SELECT_EXISTING_RECIPIENT: {
                    target: 'updateQuoteWithRecipient',
                    actions: assign({
                        selectedRecipient: (context, event) => event.recipient,
                    }),
                },
                ADD_NEW_RECIPIENT: 'addRecipient',
            },
        },
        updateQuoteWithRecipient: {
            invoke: {
                src: 'updateQuoteRecipient',
                onDone: {
                    target: 'confirm',
                    actions: assign({
                        quote: (context, event) => event.data,
                    }),
                },
                onError: {
                    target: 'error',
                },
            },
        },
        addRecipient: {
            invoke: {
                src: 'addRecipientWizard',
                onDone: {
                    target: 'updateQuoteWithRecipient',
                    actions: assign({
                        selectedRecipient: (context, event) => event.data,
                    }),
                },
                onError: {
                    target: 'error',
                },
            },
        },
        confirm: {
            type: 'final',
        },
        error: {
            type: 'final',
        },
    },
});