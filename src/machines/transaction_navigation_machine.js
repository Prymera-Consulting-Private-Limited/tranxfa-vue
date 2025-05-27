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
                        target: 'provideAddress',
                        guard: ({context}) => customer.data.addressInformationRequired() && (context.quote?.recipient || null) !== null,
                    },
                    {
                        target: 'accountVerification',
                        guard: ({context}) => {
                            return context.quote?.pendingDocuments?.length > 0 && (context.quote?.recipient || null) !== null;
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
                        target: 'provideAddress',
                        guard: ({context}) => customer.data.addressInformationRequired() && (context.quote?.recipient || null) !== null,
                    }, {
                        target: 'accountVerification',
                        guard: ({context}) => {
                            return context.quote?.pendingDocuments?.length > 0 && (context.quote?.recipient || null) !== null;
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
                        target: 'provideAddress',
                        guard: ({context}) => customer.data.addressInformationRequired() && (context.quote?.recipient || null) !== null,
                    }, {
                        target: 'accountVerification',
                        guard: ({context}) => {
                            return context.quote?.pendingDocuments?.length > 0 && (context.quote?.recipient || null) !== null;
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
        provideAddress: {
            on: {
                PROCEED: [
                    {
                        target: 'accountVerification',
                        guard: ({context}) => {
                            return context.quote?.pendingDocuments?.length > 0 && (context.quote?.recipient || null) !== null;
                        },
                    }, {
                        target: 'confirm',
                    },
                ],
                SELECT_RECIPIENT: {
                    target: 'selectRecipient'
                },
            }
        },
        accountVerification: {
            on: {
                PROCEED: [
                    {
                        target: 'confirm',
                        guard: ({context}) => {
                            return context.quote?.pendingDocuments?.length === 0 && (context.quote?.recipient || null) !== null;
                        },
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
        uploadAnotherPoi: {
            on: {
                PROCEED: [
                    {
                        target: 'confirm',
                    },
                ],
            }
        },
        poiInfoCheckFailed: {
            on: {
                PROCEED: [
                    {
                        target: 'confirm',
                    },
                ],
                SELECT_RECIPIENT: {
                    target: 'selectRecipient'
                },
                UPLOAD_ANOTHER_POI: {
                    target: 'uploadAnotherPoi'
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
                ACCOUNT_VERIFICATION_REQUIRED: [
                    {
                        target: 'accountVerification',
                    },
                ],
                POI_INFO_CHECK_FAILED: [
                    {
                        target: 'poiInfoCheckFailed',
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