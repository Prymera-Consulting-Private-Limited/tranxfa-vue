import {describe, expect, it} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import MoneyInput from "@/components/MoneyInput.vue";

const aud = {code: 'AUD', iconUnicode: '$', decimalPlaces: 2};
const jpy = {code: 'JPY', iconUnicode: '¥', decimalPlaces: 0};
const country = {id: 'au', iso2Alpha: 'AU', commonName: 'Australia'};

function mountInput(amount = 100, currency = aud) {
    return mount(MoneyInput, {
        props: {country, currency: {...currency, id: currency.code}, options: [], amount, inputId: 'amount', errors: []},
        global: {stubs: {Menu: true, MenuButton: true, MenuItems: true, MenuItem: true, FlagIcon: true}},
    });
}

const field = wrapper => wrapper.get('#amount');
const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

/** One keystroke at a time, the way a person types. */
async function type(wrapper, text) {
    await field(wrapper).trigger('focus');
    for (let i = 1; i <= text.length; i++) {
        setter.call(field(wrapper).element, text.slice(0, i));
        await field(wrapper).trigger('input');
    }
    await flushPromises();
}

describe('typing an amount', () => {
    it('means what it says: 200 is two hundred', async () => {
        const wrapper = mountInput(100);
        await type(wrapper, '200');

        expect(field(wrapper).element.value).toBe('200');
        expect(wrapper.emitted('update:amount').at(-1)).toEqual([200]);
    });

    it('groups thousands as they are typed and keeps two decimals', async () => {
        const wrapper = mountInput(0);
        await type(wrapper, '1234.567');

        expect(field(wrapper).element.value).toBe('1,234.56');
        expect(wrapper.emitted('update:amount').at(-1)).toEqual([1234.56]);
    });

    it('drops anything that is not a digit or one decimal point', async () => {
        const wrapper = mountInput(0);
        setter.call(field(wrapper).element, '1a2.3.4');
        await field(wrapper).trigger('input');

        expect(field(wrapper).element.value).toBe('12.34');
    });

    it('takes no decimals for a currency that has none', async () => {
        const wrapper = mountInput(0, jpy);
        await type(wrapper, '1500.9');

        expect(field(wrapper).element.value).toBe('1,500');
        expect(wrapper.emitted('update:amount').at(-1)).toEqual([1500]);
    });

    it('settles into the full format when the field is left', async () => {
        const wrapper = mountInput(0);
        await type(wrapper, '200');
        await field(wrapper).trigger('blur');

        expect(field(wrapper).element.value).toBe('200.00');
    });

    it('emits nothing for an empty or half-typed value', async () => {
        const wrapper = mountInput(100);
        await type(wrapper, '.');
        expect(wrapper.emitted('update:amount')).toBeUndefined();
    });
});

// This is the bug a Xenvia client hit on production (Calculator-Issue, 22 Sep
// 2026): the field was bound to the parent's amount through v-model with a
// no-op setter, so any re-render wrote the parent's stale amount back over
// what was being typed. On screen that showed as the send and receive amounts
// no longer agreeing with each other - once by a full order of magnitude,
// because the flip happened after the customer had typed a much bigger number
// and cut it back down before the requote for it returned.
describe('the field is not overwritten while the customer types', () => {
    it('keeps the typed text through a re-render', async () => {
        const wrapper = mountInput(0.5);
        await type(wrapper, '123.45');

        await wrapper.setProps({errors: ['too much']});
        await wrapper.setProps({errors: []});

        expect(field(wrapper).element.value).toBe('123.45');
    });

    it('keeps the typed text when the parent echoes the same number', async () => {
        const wrapper = mountInput(0.5);
        await type(wrapper, '123.45');

        const emittedWhileTyping = wrapper.emitted('update:amount').length;
        await wrapper.setProps({amount: 123.45});

        expect(field(wrapper).element.value).toBe('123.45');
        expect(wrapper.emitted('update:amount').at(-1)).toEqual([123.45]);
        expect(wrapper.emitted('update:amount'), 'the parent echo became a new emit').toHaveLength(emittedWhileTyping);
    });

    it('does not snap a typed 50 back to a quote that was still priced for 500.02', async () => {
        const wrapper = mountInput(50);
        await type(wrapper, '500.02');

        // The debounced re-quote for 500.02 has not resolved yet - the parent's
        // amount is still the last confirmed figure, 50. The customer has
        // already cut the number back down to 50 by the time it does.
        await wrapper.setProps({amount: 50});
        await type(wrapper, '50');

        expect(field(wrapper).element.value).toBe('50');
    });

    it('takes a different number from the parent, such as a clamped maximum', async () => {
        const wrapper = mountInput(0.5);
        await type(wrapper, '999999999');

        await wrapper.setProps({amount: 15000});

        expect(field(wrapper).element.value).toBe('15,000.00');
    });

    it('shows the parent amount when nobody is typing', async () => {
        const wrapper = mountInput(100);
        await wrapper.setProps({amount: 2500});

        expect(field(wrapper).element.value).toBe('2,500.00');
        expect(wrapper.emitted('update:amount')).toBeUndefined();
    });
});

// Calculator.vue re-quotes from this on Enter-key submission, which never
// fires blur.
describe('pendingAmount', () => {
    it('is null until the field differs from the parent amount', async () => {
        const wrapper = mountInput(100);
        expect(wrapper.vm.pendingAmount()).toBeNull();
    });

    it('reports the typed value while it has not reached the parent yet', async () => {
        const wrapper = mountInput(100);
        await type(wrapper, '250');

        // update:amount already fired for 250, but the parent prop (amount)
        // has not been echoed back yet - the same gap saveQuote() re-quotes.
        expect(wrapper.vm.pendingAmount()).toBe(250);
    });

    it('is null again once the parent catches up', async () => {
        const wrapper = mountInput(100);
        await type(wrapper, '250');
        await wrapper.setProps({amount: 250});

        expect(wrapper.vm.pendingAmount()).toBeNull();
    });
});

describe('the error message', () => {
    it('is tied to the field for assistive tech', async () => {
        const wrapper = mountInput(100);
        await wrapper.setProps({errors: ['The maximum you can send is AUD 15,000.00.']});

        expect(field(wrapper).attributes('aria-invalid')).toBe('true');
        expect(field(wrapper).attributes('aria-describedby')).toBe('amount-error');
        expect(wrapper.get('#amount-error').text()).toContain('maximum');
    });
});
