import {describe, expect, it} from "vitest";
import {fixture, fixtureNames} from "./fixtures.js";
import Customer from "@/models/customer.js";
import Quote from "@/models/quote.js";
import TransactionQuote from "@/models/transaction_quote.js";
import PayoutChannel from "@/models/payout_channel.js";
import Recipient from "@/models/recipient.js";
import Country from "@/models/country.js";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";
import RecipientDataType from "@/enums/recipient_data_type.js";

// These run the real mappers over real captured payloads, so they fail if the
// backend changes a field name the SPA reads. That is the point: the mappers
// are silent on unknown keys, so only a fixture-backed assertion catches drift.

describe('fixtures', () => {
    it('are all valid JSON and non-empty', () => {
        const names = fixtureNames();
        expect(names.length).toBeGreaterThan(40);
        for (const name of names) {
            expect(fixture(name), name).toBeTruthy();
        }
    });

    it('hands back an independent copy each time', () => {
        const first = fixture('profile-05-onboarded');
        first.name = 'mutated';
        expect(fixture('profile-05-onboarded').name).not.toBe('mutated');
    });

    it('carries no AWS credentials or local paths', () => {
        for (const name of fixtureNames()) {
            const raw = JSON.stringify(fixture(name));
            expect(raw, name).not.toMatch(/AKIA[A-Z0-9]{10,}/);
            expect(raw, name).not.toMatch(/\/Users\//);
        }
    });
});

describe('Customer mapper against captured profiles', () => {
    it('maps the onboarded profile', () => {
        const customer = Customer.getInstance(fixture('profile-05-onboarded'));

        expect(customer.id).toBeTruthy();
        // The profile endpoint masks the local part — this is what the MFA and
        // email-verification screens render, so never assert a full address.
        expect(customer.account.email).toMatch(/^\w{2}\*+@gmail\.com$/);
        expect(customer.account.isEmailVerified).toBe(true);
        expect(customer.account.mobileNumber).toBeTruthy();
        expect(customer.country).toBeInstanceOf(Country);
        expect(customer.country.iso2Alpha).toBe('AU');
        expect(customer.attributes.length).toBeGreaterThan(0);
    });

    // The onboarding machine's guards are these three predicates, so they are
    // asserted directly against each captured stage of the real flow.
    it.each([
        ['profile-01-fresh',          {identity: true,  address: true}],
        ['profile-02-email-verified', {identity: true,  address: true}],
        ['profile-03-identity-done',  {identity: false, address: true}],
        ['profile-04-address-done',   {identity: false, address: false}],
        ['profile-05-onboarded',      {identity: false, address: false}],
    ])('%s drives the onboarding guards correctly', (name, expected) => {
        const customer = Customer.getInstance(fixture(name));

        expect(customer.identityInformationRequired()).toBe(expected.identity);
        expect(customer.addressInformationRequired()).toBe(expected.address);
    });

    it('exposes attributes grouped by the categories the forms filter on', () => {
        const customer = Customer.getInstance(fixture('profile-02-email-verified'));
        const categories = new Set(customer.attributes.map(a => a.category));

        expect(categories.has(CustomerAttributeCategory.IDENTITY)).toBe(true);
        expect(categories.has(CustomerAttributeCategory.ADDRESS)).toBe(true);
    });

    it('keeps dotted attribute names, which updateProfileAttribute un-flattens', () => {
        const customer = Customer.getInstance(fixture('profile-02-email-verified'));
        const names = customer.attributes.map(a => a.attribute);

        expect(names).toContain('birth_detail.birth_date');
        expect(names).toContain('address.address_line_1');
    });
});

describe('Quote mapper', () => {
    it('maps the calculator quote, including pre-formatted money', () => {
        const quote = Quote.getInstance(fixture('quote-send-100'));

        expect(quote.amountType).toBeTruthy();
        expect(quote.exchangeRate).toBeTruthy();
        expect(quote.exchangeRateFormatted).toBeTruthy();
        // The SPA never formats currency itself.
        expect(quote.localAmountCurrencyPrefixed).toMatch(/\d/);
        expect(quote.foreignAmountCurrencyPrefixed).toMatch(/\d/);
        expect(quote.sources.length).toBeGreaterThan(0);
        expect(quote.targets.length).toBeGreaterThan(0);
        expect(quote.payoutMethods.length).toBeGreaterThan(0);
    });

    it('surfaces an over-limit as an alert on a 200, not an error', () => {
        const payload = fixture('quote-alert-max-amount');
        const quote = Quote.getInstance(payload);

        // Calculator reads alerts.send_amount and pushes it into the send-field
        // errors; the request itself succeeded.
        expect(quote.alerts?.send_amount).toMatch(/maximum/i);
        expect(quote.transferDisableReason).toBeNull();
    });
});

describe('TransactionQuote mapper', () => {
    it('maps a quote with no recipient chosen yet', () => {
        const quote = TransactionQuote.getInstance(fixture('transaction-quote-no-recipient'));

        expect(quote.id).toBeTruthy();
        expect(quote.recipient).toBeNull();
    });

    it('maps a quote once a recipient is attached', () => {
        const quote = TransactionQuote.getInstance(fixture('transaction-quote-with-recipient'));

        expect(quote.recipient).toBeInstanceOf(Recipient);
        expect(quote.recipient.wholeName).toBe('Grace Hopper');
        expect(quote.purposes.length).toBeGreaterThan(0);
        expect(quote.paymentMethods.length).toBeGreaterThan(0);
        expect(quote.pendingDocuments.map(d => d.code)).toContain('POI');
    });
});

describe('PayoutChannel mapper', () => {
    it('maps the channel attributes that define the recipient form', () => {
        const channel = PayoutChannel.getInstance(fixture('payout-channel'));

        expect(channel.id).toBeTruthy();
        expect(channel.attributes.length).toBeGreaterThan(0);

        const types = channel.attributes.map(a => a.type);
        expect(types).toContain(RecipientDataType.NAME);
        expect(types).toContain(RecipientDataType.ACCOUNT_NUMBER);

        for (const attribute of channel.attributes) {
            expect(attribute.attribute, 'every attribute needs a name').toBeTruthy();
            expect(attribute.label, `${attribute.attribute} needs a label`).toBeTruthy();
        }
    });

    it('every attribute type has a component mapping', () => {
        // Mirrors AttributeCollection's componentMap. An unmapped type silently
        // degrades to a plain text input, so it is worth failing loudly here.
        const mapped = new Set(Object.values(RecipientDataType));
        const channel = PayoutChannel.getInstance(fixture('payout-channel'));

        for (const attribute of channel.attributes) {
            expect(mapped.has(attribute.type), `unmapped type: ${attribute.type}`).toBe(true);
        }
    });
});

describe('Error envelopes the SPA branches on', () => {
    it('412 account_verification_required carries pending documents', () => {
        const body = fixture('confirm-quote');

        expect(body.type).toBe('account_verification_required');
        expect(body.pending_documents.length).toBeGreaterThan(0);
        // The wizard re-maps these into quote.pendingDocuments.
        expect(body.pending_documents[0].code).toBeTruthy();
    });

    it('every 422 carries a message the SPA can display', () => {
        for (const name of fixtureNames().filter(n => n.startsWith('error-422'))) {
            expect(fixture(name).message, name).toBeTruthy();
        }
    });

    it('validation 422s carry a field errors map; a rejected credential does not', () => {
        // Two distinct shapes from the same status code. Views that only read
        // `errors` show nothing on a bad-credentials response, so SignInView
        // renders `message` instead.
        const validation = fixture('error-422-update-identity');
        expect(validation.errors).toBeTypeOf('object');
        expect(Object.keys(validation.errors).length).toBeGreaterThan(0);

        const credentials = fixture('error-422-login-bad-credentials');
        expect(credentials.errors).toBeUndefined();
        expect(credentials.message).toMatch(/does not match/i);
    });

    it('signup rejects an unaccepted third-party declaration', () => {
        // The bug this documents: SignUpView only surfaces email/password/
        // confirm_password, so this error is silently dropped.
        const body = fixture('error-422-signup-declaration');

        expect(Object.keys(body.errors)).toContain('third_party_declaration_accepted');
    });

    it('the wallet probe 404 has no type, meaning UNAVAILABLE', () => {
        const body = fixture('wallet-subscription-unavailable-404');

        // wallet_utils.probe(): a 404 without a JSON type means the deployment
        // holds no wallet licence, as opposed to the customer being eligible.
        expect(body.type).toBeUndefined();
        expect(body.wallet_offered).toBeUndefined();
    });
});
