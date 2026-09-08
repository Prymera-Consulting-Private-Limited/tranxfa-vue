import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import axios from "axios";
import {useCustomerStore} from "@/stores/customer.js";
import Customer from "@/models/customer.js";
import {fixture, fixtureError, fixtureResponse} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));

const pinia = createPinia();
setActivePinia(pinia);
const {default: Calculator} = await import("@/components/Calculator.vue");
const router = (await import("@/router/index.js")).default;

const stubs = {
    MoneyInput: {
        name: 'MoneyInput',
        props: ['amount', 'errors', 'inputId', 'options', 'country', 'currency'],
        // saveQuote() reaches through a template ref for this. The real
        // component returns an amount typed but not yet blurred, or null.
        methods: {
            pendingAmount: () => null,
        },
        template: '<div class="money-input" :data-id="inputId" :data-errors="JSON.stringify(errors)" />',
    },
    MoneyInputShimmer: true,
    Spinner: true,
    Listbox: true,
    ListboxButton: true,
    ListboxLabel: true,
    ListboxOptions: true,
    ListboxOption: true,
    RouterLink: {name: 'RouterLink', template: '<a><slot /></a>'},
};

function loadCustomer() {
    const store = useCustomerStore(pinia);
    store.isLoaded = true;
    store.customer.data = Customer.getInstance(fixture('profile-05-onboarded'));

    return store;
}

async function mountCalculator(quoteFixture = 'quote-send-100') {
    axios.get.mockResolvedValue(fixtureResponse(quoteFixture));
    const wrapper = mount(Calculator, {global: {plugins: [pinia], stubs}});
    await flushPromises();

    return wrapper;
}

const errorsOn = (wrapper, id) =>
    JSON.parse(wrapper.get(`[data-id="${id}"]`).attributes('data-errors') || '[]');

/**
 * Type into one of the amount fields and let the debounce elapse.
 *
 * Amount edits are debounced by 300ms, so emitting alone no longer produces a
 * request - which is the point of the debounce and the reason every test that
 * types has to go through here rather than awaiting flushPromises on its own.
 */
async function typeAmount(input, amount) {
    input.vm.$emit('update:amount', amount);
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
}

describe('Calculator', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        loadCustomer();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('quotes on mount and renders both money inputs', async () => {
        const wrapper = await mountCalculator();

        expect(axios.get).toHaveBeenCalledWith('/client/v1/quote', expect.anything());
        expect(wrapper.find('[data-id="send-money-input"]').exists()).toBe(true);
        expect(wrapper.find('[data-id="receive-money-input"]').exists()).toBe(true);
    });

    // The backend restates every field on each quote, and the Calculator copies
    // the response back into its own query. Computing the other side locally is
    // exactly what this avoids.
    it('re-quotes with amount_type=send when the send field changes', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        await typeAmount(wrapper.getComponent({name: 'MoneyInput'}), '250');

        const params = axios.get.mock.calls.at(-1)[1].params;
        expect(params.amount_type).toBe('send');
        expect(params.amount).toBe('250');
    });

    it('re-quotes with amount_type=receive when the payout field changes', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        const inputs = wrapper.findAllComponents({name: 'MoneyInput'});
        await typeAmount(inputs[1], '900');

        const params = axios.get.mock.calls.at(-1)[1].params;
        expect(params.amount_type).toBe('receive');
        expect(params.amount).toBe('900');
    });

    // An over-limit amount is a 200 carrying alerts, not an error response.
    // Treating it as a failure would blank the quote the customer is reading.
    it('shows an over-limit alert against the send field, from a 200', async () => {
        const wrapper = await mountCalculator('quote-alert-max-amount');

        expect(errorsOn(wrapper, 'send-money-input')[0]).toMatch(/maximum/i);
        expect(errorsOn(wrapper, 'receive-money-input')).toEqual([]);
    });

    it('clears stale alerts on the next successful quote', async () => {
        const wrapper = await mountCalculator('quote-alert-max-amount');
        expect(errorsOn(wrapper, 'send-money-input')).toHaveLength(1);

        axios.get.mockResolvedValue(fixtureResponse('quote-send-100'));
        await typeAmount(wrapper.getComponent({name: 'MoneyInput'}), '100');

        expect(errorsOn(wrapper, 'send-money-input')).toEqual([]);
    });

    describe('422 validation', () => {
        // Which field an amount error belongs to depends on which side the
        // customer typed in - the API does not say.
        it('attributes an amount error to the send field after a send edit', async () => {
            const wrapper = await mountCalculator();
            axios.get.mockRejectedValue(
                Object.assign(new Error('bad'), {
                    response: {status: 422, data: {errors: {amount: ['Too small.']}}},
                }),
            );

            await typeAmount(wrapper.getComponent({name: 'MoneyInput'}), '1');

            expect(errorsOn(wrapper, 'send-money-input')).toEqual(['Too small.']);
            expect(errorsOn(wrapper, 'receive-money-input')).toEqual([]);
        });

        it('attributes the same error to the payout field after a receive edit', async () => {
            const wrapper = await mountCalculator();
            axios.get.mockRejectedValue(
                Object.assign(new Error('bad'), {
                    response: {status: 422, data: {errors: {amount: ['Too small.']}}},
                }),
            );

            const inputs = wrapper.findAllComponents({name: 'MoneyInput'});
            await typeAmount(inputs[1], '1');

            expect(errorsOn(wrapper, 'receive-money-input')).toEqual(['Too small.']);
            expect(errorsOn(wrapper, 'send-money-input')).toEqual([]);
        });
    });

    it('reports a rates outage instead of rendering a broken quote', async () => {
        axios.get.mockRejectedValue(
            Object.assign(new Error('down'), {
                response: {status: 503, data: {message: 'Rates are unavailable.'}},
            }),
        );
        const wrapper = mount(Calculator, {global: {plugins: [pinia], stubs}});
        await flushPromises();

        expect(wrapper.text()).toContain('Rates are unavailable.');
        expect(wrapper.find('[data-id="send-money-input"]').exists()).toBe(false);
    });

    describe('saving', () => {
        it('persists the quote and routes to the wizard', async () => {
            const wrapper = await mountCalculator();
            axios.post.mockResolvedValue(fixtureResponse('quote-saved'));

            await wrapper.get('form').trigger('submit');
            await flushPromises();

            expect(axios.post).toHaveBeenCalledWith('/client/v1/quote', expect.anything());
            expect(router.push).toHaveBeenCalledWith(
                expect.objectContaining({name: 'transferWizard'}),
            );
        });

        // payout_company_id is how the backend resolves CompanyPayoutChannel.
        // Omitting it answers 503 rather than a validation error, so it is worth
        // asserting the client actually sends it.
        it('sends payout_company_id with the saved quote', async () => {
            const wrapper = await mountCalculator();
            axios.post.mockResolvedValue(fixtureResponse('quote-saved'));

            await wrapper.get('form').trigger('submit');
            await flushPromises();

            const body = axios.post.mock.calls.at(-1)[1];
            expect(body).toHaveProperty('payout_company_id');
            expect(body.payout_company_id).toBeTruthy();
        });

        it('does not navigate when saving fails', async () => {
            const wrapper = await mountCalculator();
            axios.post.mockRejectedValue(fixtureError('error-401-profile', 401));

            await wrapper.get('form').trigger('submit');
            await flushPromises();

            expect(router.push).not.toHaveBeenCalled();
        });
    });

    it('replaces the send button with an explanation when sending is blocked', async () => {
        const store = loadCustomer();
        store.customer.data.isBlockedForSending = true;

        const wrapper = await mountCalculator();

        expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
        expect(wrapper.text()).toMatch(/temporarily restricted/i);
    });
});

describe('Calculator quote debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        loadCustomer();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // The reason this exists: every character used to fire its own /quote, so
    // typing "1000" was four requests against a rate provider and three of them
    // were thrown away before anyone saw them.
    it('makes one request for a burst of typing, not one per character', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();
        const input = wrapper.getComponent({name: 'MoneyInput'});

        for (const amount of ['1', '10', '100', '1000']) {
            input.vm.$emit('update:amount', amount);
            await vi.advanceTimersByTimeAsync(50);
        }
        await vi.advanceTimersByTimeAsync(300);
        await flushPromises();

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get.mock.calls[0][1].params.amount).toBe('1000');
    });

    it('does not price until the typing stops', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        wrapper.getComponent({name: 'MoneyInput'}).vm.$emit('update:amount', '250');
        await vi.advanceTimersByTimeAsync(299);
        expect(axios.get).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        await flushPromises();
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    // The counterpart of the comment in sentAmountUpdated: the field must stay
    // mounted while the customer types, so the shimmer does not take the caret.
    it('keeps the amount field mounted while typing', async () => {
        const wrapper = await mountCalculator();

        wrapper.getComponent({name: 'MoneyInput'}).vm.$emit('update:amount', '250');
        await flushPromises();

        expect(wrapper.findComponent({name: 'MoneyInput'}).exists()).toBe(true);
        expect(wrapper.findComponent({name: 'MoneyInputShimmer'}).exists()).toBe(false);
    });

    // A currency change is one deliberate act, not a stream. Waiting 300ms to
    // act on a dropdown is latency with nothing bought for it.
    it('prices a currency change immediately', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();
        const quote = fixture('quote-send-100');

        wrapper.getComponent({name: 'MoneyInput'}).vm.$emit('option:updated', {
            country: quote.payment_country, currency: quote.payment_currency,
        });
        await flushPromises();

        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    // The keystroke would otherwise land after the selection, pricing against
    // the currency the customer has just moved away from.
    it('drops a pending keystroke when a currency is chosen', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();
        const quote = fixture('quote-send-100');
        const input = wrapper.getComponent({name: 'MoneyInput'});

        input.vm.$emit('update:amount', '250');
        await vi.advanceTimersByTimeAsync(100);
        input.vm.$emit('option:updated', {country: quote.payment_country, currency: quote.payment_currency});
        await flushPromises();
        await vi.advanceTimersByTimeAsync(300);
        await flushPromises();

        expect(axios.get, 'the cancelled keystroke must not fire afterwards').toHaveBeenCalledTimes(1);
    });

    // Worth recording why there is no test here for two quotes overlapping:
    // they cannot. Every control that triggers one - both amount fields and the
    // delivery-method listbox - sits behind v-if="! isFetchingQuote", so while
    // a request is in flight none of them exist to fire another. An attempt at
    // request-sequencing was written and then removed once that was checked.
    //
    // If any of those controls is ever left mounted during a fetch, that stops
    // being true and the sequencing has to come back.
    it('leaves nothing mounted that could start a second quote mid-flight', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();
        axios.get.mockImplementation(() => new Promise(() => {}));   // never settles

        wrapper.getComponent({name: 'MoneyInput'}).vm.$emit('option:updated', {
            country: fixture('quote-send-100').payment_country,
            currency: fixture('quote-send-100').payment_currency,
        });
        await flushPromises();

        expect(wrapper.findComponent({name: 'MoneyInput'}).exists(), 'amount fields').toBe(false);
        expect(wrapper.findComponent({name: 'Listbox'}).exists(), 'delivery method').toBe(false);
    });

    it('cancels a pending request when the calculator goes away', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        wrapper.getComponent({name: 'MoneyInput'}).vm.$emit('update:amount', '250');
        wrapper.unmount();
        await vi.advanceTimersByTimeAsync(300);
        await flushPromises();

        expect(axios.get).not.toHaveBeenCalled();
    });
});
