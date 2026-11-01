import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import axios from "axios";
import AttributeCollection from "@/components/Recipient/AttributeCollection.vue";
import PayoutChannel from "@/models/payout_channel.js";
import Country from "@/models/country.js";
import Currency from "@/models/currency.js";
import PayoutMethod from "@/models/payout_method.js";
import Relationship from "@/models/relationship.js";
import {fixture, fixtureError, fixtureResponse} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));

// Every attribute input is stubbed to the same shape: it re-emits whatever the
// test tells it to. These tests are about AttributeCollection's own wiring -
// error keys, lookup, cascade, save - not about the inputs themselves.
const inputStub = (name) => ({
    name,
    props: ['attribute', 'input', 'isLookingUp', 'disableNameInput', 'country', 'relationships'],
    template: '<div :data-input="attribute?.attribute ?? name" />',
});

const stubs = {
    NameInput: inputStub('NameInput'),
    SecondNameInput: inputStub('SecondNameInput'),
    ThirdNameInput: inputStub('ThirdNameInput'),
    TextInput: inputStub('TextInput'),
    SelectInput: inputStub('SelectInput'),
    DeliveryOptionInput: inputStub('DeliveryOptionInput'),
    SubDeliveryOptionInput: inputStub('SubDeliveryOptionInput'),
    AccountNumberInput: {
        name: 'AccountNumberInput',
        props: ['attribute'],
        template: '<div :data-input="attribute?.attribute"><slot /></div>',
    },
    PhoneNumberInput: inputStub('PhoneNumberInput'),
    MobileNumberInput: inputStub('MobileNumberInput'),
    EmailInput: inputStub('EmailInput'),
    RelationshipInput: inputStub('RelationshipInput'),
    Spinner: true,
};

const attribute = (over = {}) => ({
    attribute: 'name_on_account',
    type: 'name',
    label: 'Name on account',
    is_required: true,
    ...over,
});

/**
 * Build a PayoutChannel through the real mapper. The seeded corridor only has a
 * name and an account number, so richer shapes are constructed here rather than
 * captured.
 */
function channel({attributes = [attribute()], configuration = {}} = {}) {
    return PayoutChannel.getInstance({
        id: 'ch-1',
        configuration: {
            recipient_type: null,
            confirm_account_number: false,
            name_lookup_requirements: [],
            name_validation_requirements: [],
            ...configuration,
        },
        attributes,
    });
}

function collectionProps(payoutChannel = channel(), over = {}) {
    return {
        country: Country.getInstance({id: 'c-1', iso2_alpha: 'NG'}),
        currency: Currency.getInstance({id: 'cu-1', iso_alpha: 'NGN'}),
        payoutMethod: PayoutMethod.getInstance({id: 'pm-1', code: 'BANK-TRANSFER'}),
        payoutChannel,
        type: 'individual',
        relationships: [Relationship.getInstance({id: 'rel-1', code: 'FRIEND', title: 'Friend'})],
        ...over,
    };
}

function mountCollection(payoutChannel = channel(), props = {}) {
    return mount(AttributeCollection, {
        props: collectionProps(payoutChannel, props),
        global: {stubs},
    });
}

describe('AttributeCollection', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.useRealTimers());

    describe('rendering the channel definition', () => {
        it('renders an input per attribute, chosen by type', () => {
            const wrapper = mountCollection(channel({
                attributes: [
                    attribute(),
                    attribute({attribute: 'account_number', type: 'account_number', label: 'Account number'}),
                    attribute({attribute: 'email', type: 'email', label: 'Email'}),
                ],
            }));

            expect(wrapper.findComponent({name: 'NameInput'}).exists()).toBe(true);
            expect(wrapper.findComponent({name: 'AccountNumberInput'}).exists()).toBe(true);
            expect(wrapper.findComponent({name: 'EmailInput'}).exists()).toBe(true);
        });

        // An unmapped type degrades to a plain text input rather than throwing,
        // which is why a new backend type can ship and look almost right.
        it('falls back to a text input for a type it does not know', () => {
            const wrapper = mountCollection(channel({
                attributes: [attribute({attribute: 'branch_code', type: 'not_a_real_type'})],
            }));

            expect(wrapper.findComponent({name: 'TextInput'}).exists()).toBe(true);
        });

        it('renders the label and the required marker from the channel', () => {
            const wrapper = mountCollection(channel({
                attributes: [attribute({label: 'Beneficiary name', is_required: true})],
            }));

            expect(wrapper.text()).toContain('Beneficiary name');
            expect(wrapper.html()).toContain('*');
        });

        it('adds a confirmation field when the channel asks for one', () => {
            const wrapper = mountCollection(channel({
                attributes: [attribute({attribute: 'account_number', type: 'account_number', label: 'Account number'})],
                configuration: {confirm_account_number: true},
            }));

            expect(wrapper.text()).toContain('Confirm Account number');
        });
    });

    describe('saving', () => {
        it('posts the collected input and emits the new recipient', async () => {
            const wrapper = mountCollection();
            axios.post.mockResolvedValue(fixtureResponse('recipient-added'));

            await wrapper.getComponent({name: 'NameInput'})
                .vm.$emit('recipient:input:updated', 'Grace Hopper', {attribute: 'name_on_account', type: 'name'});
            await wrapper.get('form').trigger('submit');
            await flushPromises();

            expect(axios.post).toHaveBeenCalledWith(
                '/client/v1/recipients/add',
                expect.objectContaining({name_on_account: 'Grace Hopper'}),
                expect.anything(),
            );
            expect(wrapper.emitted('recipient:added')).toHaveLength(1);
        });

        // The wizard hides the save button and drives this from the parent's
        // Continue button instead.
        //
        // The harness mirrors what IndexView actually does, and that detail is
        // load-bearing: the save-trigger watchEffect reads isSaving, so it
        // re-runs when addRecipient() finishes. If the trigger were still true
        // at that moment it would save again, and again. The parent clearing it
        // synchronously in the emit handler is the only thing preventing a
        // repeat POST - see the re-entrancy test below.
        const harness = () => ({
            components: {AttributeCollection},
            data: () => ({submitted: false}),
            template: `
                <AttributeCollection
                    v-bind="$attrs"
                    :isSubmitted="submitted"
                    @recipient:added="submitted = false"
                    @recipient:add:failed="submitted = false" />`,
        });

        it('saves when the parent flips externalSaveTrigger', async () => {
            axios.post.mockResolvedValue(fixtureResponse('recipient-added'));
            const parent = mount(harness(), {
                attrs: {...collectionProps(channel()), quote: {id: 'q-1'}},
                global: {stubs},
            });
            expect(parent.find('button[type="submit"]').exists()).toBe(false);

            await parent.setData({submitted: true});
            await flushPromises();

            expect(axios.post).toHaveBeenCalledTimes(1);
        });

        // Guards the hazard rather than the fix: this asserts the component
        // does not re-post while the parent behaves. If the trigger is ever
        // left set - a parent that forgets to reset, or resets a tick late -
        // the effect re-fires. Worth knowing before wiring a second caller.
        it('posts exactly once per trigger while the parent resets it', async () => {
            axios.post.mockResolvedValue(fixtureResponse('recipient-added'));
            const parent = mount(harness(), {
                attrs: {...collectionProps(channel()), quote: {id: 'q-1'}},
                global: {stubs},
            });

            await parent.setData({submitted: true});
            await flushPromises();
            await flushPromises();

            expect(axios.post).toHaveBeenCalledTimes(1);
        });

        it('maps a 422 onto the per-attribute error keys and reports failure', async () => {
            const wrapper = mountCollection(channel({
                attributes: [
                    attribute(),
                    attribute({attribute: 'mobile_number', type: 'account_number', label: 'Mobile number'}),
                ],
            }));
            axios.post.mockRejectedValue(fixtureError('error-422-recipient-empty', 422));

            await wrapper.get('form').trigger('submit');
            await flushPromises();

            expect(wrapper.emitted('recipient:add:failed')).toHaveLength(1);
            // The captured fixture keys errors by attribute name.
            const body = fixture('error-422-recipient-empty');
            for (const message of Object.values(body.errors).map(v => v[0])) {
                expect(wrapper.text()).toContain(message);
            }
        });

        it('reports its own busy state so the parent can disable Continue', async () => {
            const wrapper = mountCollection();
            axios.post.mockResolvedValue(fixtureResponse('recipient-added'));

            await wrapper.get('form').trigger('submit');
            await flushPromises();

            const states = wrapper.emitted('recipient:add:loadingStateUpdated').flat();
            expect(states).toContain(true);
            expect(states.at(-1)).toBe(false);
        });
    });

    describe('name lookup', () => {
        const lookupChannel = () => channel({
            attributes: [
                attribute(),
                attribute({
                    attribute: 'account_number',
                    type: 'account_number',
                    label: 'Account number',
                    exact_length: 10,
                }),
            ],
            configuration: {name_lookup_requirements: ['account_number']},
        });

        // AccountNumberInput is a wrapper: the template puts the real TextInput
        // inside its slot and binds the handler there, so emitting from the
        // wrapper itself does nothing at all.
        const setAccountNumber = (wrapper, value) =>
            wrapper.getComponent({name: 'TextInput'}).vm.$emit(
                'recipient:input:updated', value,
                {attribute: 'account_number', type: 'account_number'},
            );

        it('does not look up until the requirement passes its length rule', async () => {
            vi.useFakeTimers();
            const wrapper = mountCollection(lookupChannel());

            await setAccountNumber(wrapper, '12345');   // exact_length is 10
            vi.advanceTimersByTime(2000);
            await flushPromises();

            expect(axios.get).not.toHaveBeenCalled();
        });

        it('looks up once the requirement is satisfied, after the debounce', async () => {
            vi.useFakeTimers();
            axios.get.mockResolvedValue({status: 200, data: {name: 'Grace Hopper'}});
            const wrapper = mountCollection(lookupChannel());

            await setAccountNumber(wrapper, '1234567890');
            await flushPromises();
            expect(axios.get).not.toHaveBeenCalled();   // still inside the debounce

            // Bracket the interval rather than just "eventually": a shortened
            // debounce would fire a lookup on every keystroke of an account
            // number, which is the thing the delay exists to prevent.
            vi.advanceTimersByTime(999);
            await flushPromises();
            expect(axios.get).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1);
            await flushPromises();

            expect(axios.get).toHaveBeenCalledWith(
                '/client/v1/recipient/name-lookup/ch-1',
                expect.objectContaining({params: {account_number: '1234567890'}}),
            );
        });

        it('surfaces a lookup refusal against the name field', async () => {
            vi.useFakeTimers();
            axios.get.mockRejectedValue({
                status: 422,
                response: {status: 422, data: {message: 'Account not found.'}},
            });
            const wrapper = mountCollection(lookupChannel());

            await setAccountNumber(wrapper, '1234567890');
            vi.advanceTimersByTime(1000);
            await flushPromises();

            expect(wrapper.text()).toContain('Account not found.');
        });

        // Lookup is gated on name_lookup_requirements alone. An earlier version
        // fell back to name_validation_requirements; f2dd54a removed that on
        // purpose, so a channel carrying only validation requirements must stay
        // quiet rather than calling an endpoint the corridor does not support.
        //
        // Side effect worth knowing: configuration.nameValidationRequirements is
        // still mapped by PayoutChannelConfiguration and now read nowhere in
        // src/. It is dead until something claims it.
        it('does not look up for a channel with only validation requirements', async () => {
            vi.useFakeTimers();
            const wrapper = mountCollection(channel({
                attributes: [
                    attribute(),
                    attribute({attribute: 'account_number', type: 'account_number', exact_length: 10}),
                ],
                configuration: {
                    name_lookup_requirements: [],
                    name_validation_requirements: ['account_number'],
                },
            }));

            await setAccountNumber(wrapper, '1234567890');
            vi.advanceTimersByTime(2000);
            await flushPromises();

            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    describe('sub-delivery options', () => {
        it('loads the sub options once a delivery option is picked', async () => {
            axios.get.mockResolvedValue({status: 200, data: [{id: 'sd-1', code: 'BR', title: 'Branch'}]});
            const wrapper = mountCollection(channel({
                attributes: [
                    attribute({attribute: 'institution', type: 'delivery_option', label: 'Bank'}),
                    attribute({attribute: 'branch', type: 'sub_delivery_option', label: 'Branch'}),
                ],
            }));

            await wrapper.getComponent({name: 'DeliveryOptionInput'}).vm.$emit(
                'recipient:input:updated', {id: 'do-1'},
                {attribute: 'institution', type: 'delivery_option'},
            );
            await flushPromises();

            expect(axios.get).toHaveBeenCalledWith('/client/v1/resources/sub-delivery-options/do-1');
        });

        it('does not fetch sub options when the channel has no such attribute', async () => {
            const wrapper = mountCollection(channel({
                attributes: [attribute({attribute: 'institution', type: 'delivery_option', label: 'Bank'})],
            }));

            await wrapper.getComponent({name: 'DeliveryOptionInput'}).vm.$emit(
                'recipient:input:updated', {id: 'do-1'},
                {attribute: 'institution', type: 'delivery_option'},
            );
            await flushPromises();

            expect(axios.get).not.toHaveBeenCalled();
        });
    });
});
