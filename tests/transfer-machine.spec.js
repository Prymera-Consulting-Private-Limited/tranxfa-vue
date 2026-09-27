import {beforeEach, describe, expect, it} from "vitest";
import {createActor} from "xstate";
import {createPinia, setActivePinia} from "pinia";
import {useCustomerStore} from "@/stores/customer.js";
import Customer from "@/models/customer.js";
import TransactionQuote from "@/models/transaction_quote.js";
import {fixture} from "./fixtures.js";

// Same module-scope store capture as the onboarding machine.
const pinia = createPinia();
setActivePinia(pinia);
const {transactionNavigationMachine} = await import("@/machines/transaction_navigation_machine.js");

function setCustomer(fixtureName = 'profile-05-onboarded', {addressRequired = false} = {}) {
    const store = useCustomerStore(pinia);
    store.isLoaded = true;
    const customer = Customer.getInstance(fixture(fixtureName));
    // The guards call this directly, so override it rather than hunting for a
    // profile whose attributes happen to produce the answer we want.
    customer.addressInformationRequired = () => addressRequired;
    store.customer.data = customer;

    return customer;
}

/**
 * Start the wizard with a quote in context, the way IndexView does on mount:
 * SET_CONTEXT then PROCEED.
 */
function startWith(quote) {
    const actor = createActor(transactionNavigationMachine).start();
    actor.send({type: 'SET_CONTEXT', quote});
    actor.send({type: 'PROCEED'});

    return actor;
}

const quoteWithNoRecipients = () => {
    const quote = TransactionQuote.getInstance(fixture('transaction-quote-no-recipient'));
    quote.recipients = [];
    quote.recipient = null;
    quote.pendingDocuments = [];

    return quote;
};

const quoteWithRecipient = () => {
    const quote = TransactionQuote.getInstance(fixture('transaction-quote-with-recipient'));
    quote.pendingDocuments = [];

    return quote;
};

describe('transfer wizard navigation machine', () => {
    beforeEach(() => setCustomer());

    describe('the opening branch', () => {
        it('sends a customer with no recipients straight to addRecipient', () => {
            expect(startWith(quoteWithNoRecipients()).getSnapshot().value).toBe('addRecipient');
        });

        it('asks a customer with recipients to pick one', () => {
            const quote = quoteWithNoRecipients();
            quote.recipients = [{id: 'r-1'}];

            expect(startWith(quote).getSnapshot().value).toBe('selectRecipient');
        });

        it('goes to confirm once a recipient is attached and nothing is outstanding', () => {
            expect(startWith(quoteWithRecipient()).getSnapshot().value).toBe('confirm');
        });

        it('collects the address first when the profile still needs one', () => {
            setCustomer('profile-05-onboarded', {addressRequired: true});

            expect(startWith(quoteWithRecipient()).getSnapshot().value).toBe('provideAddress');
        });

        it('collects documents when the quote reports any pending', () => {
            const quote = TransactionQuote.getInstance(fixture('transaction-quote-with-recipient'));
            expect(quote.pendingDocuments.length).toBeGreaterThan(0);

            expect(startWith(quote).getSnapshot().value).toBe('accountVerification');
        });

        // Address is checked before documents, so a customer missing both is
        // asked for the cheaper thing first.
        it('prefers the address step over documents when both are outstanding', () => {
            setCustomer('profile-05-onboarded', {addressRequired: true});
            const quote = TransactionQuote.getInstance(fixture('transaction-quote-with-recipient'));

            expect(startWith(quote).getSnapshot().value).toBe('provideAddress');
        });
    });

    // The machine is a fast path; POST /quote/confirm is the authority. A 412
    // pushes the customer back to whichever step its `type` names, so these
    // events have to work from confirm no matter how it was reached.
    describe('the server can override the machine from confirm', () => {
        it.each([
            ['ADDRESS_REQUIRED',              'provideAddress'],
            ['ACCOUNT_VERIFICATION_REQUIRED', 'accountVerification'],
            ['POI_INFO_CHECK_FAILED',         'poiInfoCheckFailed'],
            ['SELECT_RECIPIENT',              'selectRecipient'],
        ])('%s sends confirm to %s', (event, expected) => {
            const actor = startWith(quoteWithRecipient());
            expect(actor.getSnapshot().value).toBe('confirm');

            actor.send({type: event});
            expect(actor.getSnapshot().value).toBe(expected);
        });

        it('maps every 412 type the wizard handles to a real event', () => {
            // Mirrors the table in CLAUDE.md and the catch block in
            // views/Transfer/IndexView.vue. A new refusal type added there
            // without an event here would strand the customer on confirm.
            const handled = {
                incomplete_customer_address: 'ADDRESS_REQUIRED',
                account_verification_required: 'ACCOUNT_VERIFICATION_REQUIRED',
                poi_info_check_failed: 'POI_INFO_CHECK_FAILED',
            };
            const confirmEvents = Object.keys(
                transactionNavigationMachine.config.states.confirm.on,
            );

            for (const event of Object.values(handled)) {
                expect(confirmEvents, `confirm cannot handle ${event}`).toContain(event);
            }
        });

        it('the captured 412 names a type the machine can act on', () => {
            const body = fixture('confirm-quote');
            const handled = ['incomplete_customer_address', 'account_verification_required', 'poi_info_check_failed'];

            expect(handled).toContain(body.type);
        });
    });

    describe('moving between recipient steps', () => {
        it('swaps between adding and selecting a recipient', () => {
            const quote = quoteWithNoRecipients();
            const actor = startWith(quote);
            expect(actor.getSnapshot().value).toBe('addRecipient');

            actor.send({type: 'SELECT_RECIPIENT'});
            expect(actor.getSnapshot().value).toBe('selectRecipient');

            actor.send({type: 'ADD_RECIPIENT'});
            expect(actor.getSnapshot().value).toBe('addRecipient');
        });

        it('re-reads the quote after SET_CONTEXT rather than the stale one', () => {
            const actor = startWith(quoteWithNoRecipients());
            expect(actor.getSnapshot().value).toBe('addRecipient');

            // A recipient was just created against the quote.
            actor.send({type: 'SET_CONTEXT', quote: quoteWithRecipient()});
            actor.send({type: 'PROCEED'});

            expect(actor.getSnapshot().value).toBe('confirm');
        });
    });

    // Regression guard. The address guard used to read
    // customer.data.addressInformationRequired() with no null check, so a
    // machine started before the profile loaded threw inside the guard and
    // errored the actor instead of navigating.
    describe('when the profile has not loaded yet', () => {
        beforeEach(() => {
            const store = useCustomerStore(pinia);
            store.isLoaded = false;
            store.customer.data = null;
        });

        it('navigates instead of erroring the actor', () => {
            const errors = [];
            const actor = createActor(transactionNavigationMachine);
            actor.subscribe({error: (e) => errors.push(e)});
            actor.start();
            actor.send({type: 'SET_CONTEXT', quote: quoteWithRecipient()});
            actor.send({type: 'PROCEED'});

            expect(errors).toEqual([]);
            expect(actor.getSnapshot().status).not.toBe('error');
        });

        // It falls through rather than claiming an address is owed it cannot
        // check. If one really is missing, POST /quote/confirm answers 412
        // incomplete_customer_address and ADDRESS_REQUIRED brings the customer
        // back - the server is the authority, the machine is the fast path.
        it('falls through to confirm rather than guessing the address is needed', () => {
            const actor = startWith(quoteWithRecipient());

            expect(actor.getSnapshot().value).toBe('confirm');
        });

        it('still reaches the document step when the quote reports pending ones', () => {
            const quote = TransactionQuote.getInstance(fixture('transaction-quote-with-recipient'));

            expect(startWith(quote).getSnapshot().value).toBe('accountVerification');
        });
    });
});
