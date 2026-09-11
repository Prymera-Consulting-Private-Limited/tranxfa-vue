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

/**
 * MoneyInput is deliberately NOT stubbed.
 *
 * It used to be, and the stub emitted update:amount on demand - which modelled a
 * component that reports every keystroke. The real one only did so on blur, so a
 * debounce was written, tested and merged against behaviour that did not exist.
 * These tests type into the real field for that reason.
 */
const stubs = {
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

/**
 * The errors the calculator handed to one of the money fields.
 *
 * Read from the prop rather than the rendered markup: that is the contract
 * between these two components, and it does not move when the error styling
 * does.
 */
const errorsOn = (wrapper, id) => {
    const field = wrapper.findAllComponents({name: 'MoneyInput'})
        .find(c => c.props('inputId') === id);

    return field ? field.props('errors') : [];
};

/** The real <input> behind one of the money fields. */
const amountField = (wrapper, id) => wrapper.get(`#${id}`);

/**
 * Type a value into a real amount field, one keystroke at a time.
 *
 * Sets the value through the native setter and dispatches `input`, which is what
 * maska listens to - the same path a person's typing takes. Nothing here reaches
 * for update:amount directly, so a component that stopped emitting while typing
 * would fail these rather than pass them.
 */
async function type(field, value, {perKeystrokeMs = 40} = {}) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    for (let i = 1; i <= value.length; i++) {
        setter.call(field.element, value.slice(0, i));
        await field.trigger('input');
        await vi.advanceTimersByTimeAsync(perKeystrokeMs);
    }
}

/**
 * Type, then let the debounce elapse and the request settle.
 *
 * Note what the digits mean. The mask is `reversed` with the currency's decimal
 * places, so digits fill from the right the way a till does: typing 2-5-0 is
 * 2.50, not 250. Tests pass the keystrokes and say what they add up to, because
 * that is the thing a person would get wrong.
 */
async function typeAmount(wrapper, id, keystrokes) {
    await type(amountField(wrapper, id), keystrokes);
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
        expect(wrapper.find('#send-money-input').exists()).toBe(true);
        expect(wrapper.find('#receive-money-input').exists()).toBe(true);
    });

    // The backend restates every field on each quote, and the Calculator copies
    // the response back into its own query. Computing the other side locally is
    // exactly what this avoids.
    it('re-quotes with amount_type=send when the send field changes', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        await typeAmount(wrapper, 'send-money-input', '25000');   // 250.00

        const params = axios.get.mock.calls.at(-1)[1].params;
        expect(params.amount_type).toBe('send');
        expect(params.amount).toBe(250);
    });

    it('re-quotes with amount_type=receive when the payout field changes', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        await typeAmount(wrapper, 'receive-money-input', '90000');   // 900.00

        const params = axios.get.mock.calls.at(-1)[1].params;
        expect(params.amount_type).toBe('receive');
        expect(params.amount).toBe(900);
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
        await typeAmount(wrapper, 'send-money-input', '10000');   // 100.00

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

            await typeAmount(wrapper, 'send-money-input', '100');   // 1.00

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

            await typeAmount(wrapper, 'receive-money-input', '100');   // 1.00

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
        await typeAmount(wrapper, 'send-money-input', '100000');   // 1000.00

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get.mock.calls[0][1].params.amount).toBe(1000);
    });

    it('does not price until the typing stops', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        // type() already advances 40ms after the last keystroke, so the clock
        // stands at 40 of the 300 when it returns.
        await type(amountField(wrapper, 'send-money-input'), '25000');

        await vi.advanceTimersByTimeAsync(250);          // 290 total - still waiting
        expect(axios.get).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(20);           // 310 total - past it
        await flushPromises();
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    // The counterpart of the comment in sentAmountUpdated: the field must stay
    // mounted while the customer types, so the shimmer does not take the caret.
    it('keeps the amount field mounted while typing', async () => {
        const wrapper = await mountCalculator();

        await type(amountField(wrapper, 'send-money-input'), '25000');
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

    // The fields stay mounted across a re-quote now, so a customer can keep
    // typing while a request is out and two can overlap. Whichever reply landed
    // second would win, and on this screen that is a rate and a total for an
    // amount they are no longer looking at. The overtaken one is aborted.
    it('abandons a quote that a newer one has overtaken', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        let settleOvertaken;
        const aborted = vi.fn();
        axios.get
            .mockImplementationOnce((url, config) => new Promise((resolve, reject) => {
                config?.signal?.addEventListener('abort', () => {
                    aborted();
                    reject(Object.assign(new Error('canceled'), {name: 'CanceledError', code: 'ERR_CANCELED'}));
                });
                settleOvertaken = () => resolve(fixtureResponse('quote-send-100'));
            }))
            .mockImplementationOnce(() => Promise.resolve(fixtureResponse('quote-send-100')));

        await typeAmount(wrapper, 'send-money-input', '10000');   // 100.00
        await typeAmount(wrapper, 'send-money-input', '99900');   // 999.00

        expect(aborted, 'the overtaken request was left running').toHaveBeenCalled();

        // Settling it afterwards must be a no-op rather than an error surfacing
        // for a quote nobody is waiting on.
        settleOvertaken();
        await flushPromises();
        expect(wrapper.text()).not.toContain('could not price');
    });

    it('cancels a pending request when the calculator goes away', async () => {
        const wrapper = await mountCalculator();
        axios.get.mockClear();

        await type(amountField(wrapper, 'send-money-input'), '25000');
        wrapper.unmount();
        await vi.advanceTimersByTimeAsync(300);
        await flushPromises();

        expect(axios.get).not.toHaveBeenCalled();
    });
});
