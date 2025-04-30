import { assign, createMachine } from 'xstate';

import {useCustomerStore} from "@/stores/customer.js";

const customerStore = useCustomerStore();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

export const transactionNavigationMachine = createMachine({
    id: 'moneyTransfer',
    initial: 'checkRecipients',
    context: {
        quote: null,
    },
    states: {
        checkRecipients: {
            on: {
                PROCEED: [
                    {
                        target: 'addRecipient',
                        guard: ({context}) => context.quote?.recipients?.length === 0,
                    },
                    {
                        target: 'selectRecipient',
                        guard: ({context}) => (context.quote?.recipient || null) === null,
                    },
                    {
                        target: 'verifyIdentity',
                        guard: ({context}) => {
                            return customerStore.isLoaded && (
                                customer.data?.pendingDocuments?.find(category => category.code === 'POI') || null
                            ) !== null && (context.quote?.recipient || null) !== null
                        },
                    },
                    {
                        target: 'confirm',
                    }
                ],
                SET_CONTEXT: {
                    actions: assign({
                        quote: ({context, event}) => event.quote || context.quote
                    })
                },
            }
        },
        addRecipient: {
            on: {
                PROCEED: [
                    {
                        target: 'verifyIdentity',
                        guard: ({context}) => {
                            return customerStore.isLoaded && (
                                customer.data?.pendingDocuments?.find(category => category.code === 'POI') || null
                            ) !== null && (context.quote?.recipient || null) !== null
                        },
                    },
                    {
                        target: 'confirm',
                        guard: ({context}) => context.quote?.recipient !== null,
                    },
                ],
                SELECT_RECIPIENT: {
                    target: 'selectRecipient'
                },
                SET_CONTEXT: {
                    actions: assign({
                        quote: ({context, event}) => event.quote || context.quote
                    })
                },
            },
        },
        selectRecipient: {
            on: {
                PROCEED: [
                    {
                        target: 'verifyIdentity',
                        guard: ({context}) => {
                            return customerStore.isLoaded && (
                                customer.data?.pendingDocuments?.find(category => category.code === 'POI') || null
                            ) !== null && (context.quote?.recipient || null) !== null
                        },
                    },
                    {
                        target: 'confirm',
                        guard: ({context}) => context.quote?.recipient !== null,
                    },
                ],
                ADD_RECIPIENT: {
                    target: 'addRecipient'
                },
                SET_CONTEXT: {
                    actions: assign({
                        quote: ({context, event}) => event.quote || context.quote
                    })
                },
            }
        },
        verifyIdentity: {
            on: {
                PROCEED: [
                    {
                        target: 'confirm',
                    },
                ],
                SELECT_RECIPIENT: {
                    target: 'selectRecipient'
                },
                SET_CONTEXT: {
                    actions: assign({
                        quote: ({context, event}) => event.quote || context.quote
                    })
                },
            }
        },
        provideAddress: {
            on: {
                PROCEED: [
                    {
                        target: 'confirm',
                    },
                ],
                SELECT_RECIPIENT: {
                    target: 'selectRecipient'
                },
            }
        },
        poiNameCheckFailed: {
            on: {
                PROCEED: [
                    {
                        target: 'confirm',
                    },
                ],
                SELECT_RECIPIENT: {
                    target: 'selectRecipient'
                },
                UPLOAD_ANOTHER_DOCUMENT: {
                    target: 'verifyIdentity'
                },
            }
        },
        confirm: {
            on: {
                CONFIRMED: [
                    {
                        target: 'confirmed',
                    },
                ],
                ADDRESS_REQUIRED: [
                    {
                        target: 'provideAddress',
                    },
                ],
                POI_REQUIRED: [
                    {
                        target: 'verifyIdentity',
                    },
                ],
                POI_NAME_CHECK_FAILED: [
                    {
                        target: 'poiNameCheckFailed',
                    },
                ],
                SELECT_RECIPIENT: {
                    target: 'selectRecipient'
                },
                SET_CONTEXT: {
                    actions: assign({
                        quote: ({context, event}) => event.quote || context.quote
                    })
                },
            }
        },
        confirmed: {
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