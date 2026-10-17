import {afterEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {fixture} from "./fixtures.js";
import {installFakeEcho, modalStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), replace: vi.fn(), currentRoute: {value: {query: {}}}}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

// The summary card on a transfer's page leads with "Total Amount", and showed
// nothing under it: it read a total off the transfer, which carries none. The
// total belongs to the payment, which the lines beneath it already read. Found
// on the SD-1792 staging walk.
const axios = (await import('axios')).default;
const {default: ItemView} = await import('@/views/Transaction/ItemView.vue');

afterEach(() => {
    vi.clearAllMocks();
});

async function mountTransfer(payload) {
    installFakeEcho();
    axios.get.mockResolvedValue({data: payload});
    const wrapper = mount(ItemView, {
        props: {id: payload.id},
        global: {stubs: {...modalStubs, RouterLink: {template: '<a><slot /></a>'}, Monoova: true, ManualPayment: true, PagaPayment: true}},
    });
    await flushPromises();

    return wrapper;
}

describe('the summary card on a transfer\'s page', () => {
    it('leads with the payment\'s total', async () => {
        const payload = fixture('transaction-detail');
        const wrapper = await mountTransfer(payload);

        const heading = wrapper.find('dd.text-base');
        expect(heading.exists()).toBe(true);
        expect(heading.text()).toBe(payload.payment.total_payment_amount_currency_prefixed);
        expect(heading.text()).not.toBe('');
    });
});
