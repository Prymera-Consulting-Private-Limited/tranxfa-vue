import {afterEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {fixture, fixtureError} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1423. Confirming a transfer is refused while another payment holds the
// customer's deposit account, and the refusal names that payment in held_by.
// HeldByAction takes the customer to it; ReleaseHeldPayment cancels it from the
// checkout in one step, so the confirm can go again. The holders are the
// captured refusals' own - see tests/fixtures/README.md.
const axios = (await import('axios')).default;
const {default: DepositHolder} = await import('@/models/deposit_holder.js');
const {default: ReleaseHeldPayment} = await import('@/components/Payment/ReleaseHeldPayment.vue');

afterEach(() => {
    vi.clearAllMocks();
});

const button = (wrapper, label) => wrapper.findAll('button').find(candidate => candidate.text() === label);

const mountFor = holder => mount(ReleaseHeldPayment, {props: {holder: DepositHolder.getInstance(holder)}});

async function confirmRelease(wrapper) {
    await button(wrapper, 'Cancel it and continue').trigger('click');
    await button(wrapper, 'Yes, cancel it and continue').trigger('click');
    await flushPromises();
}

const transfer = () => fixture('error-412-checkout-collides-held-by-transfer').held_by;
const hotel = () => fixture('error-409-pay-order-account-held-by-order').held_by;
const topup = () => fixture('error-412-wallet-topup-collides-held-by-topup').held_by;

describe('cancelling the payment in the way', () => {
    it.each([
        ['a transfer', transfer, h => `/client/v1/transaction/payment/${h.id}/cancel`],
        ['a hotel order', hotel, h => `/client/v1/travel/order/${h.id}/payment/${h.payment_id}/cancel`],
        ['a flight order', () => ({...hotel(), service: 'FLIGHTS'}), h => `/client/v1/travel/flights/order/${h.id}/payment/${h.payment_id}/cancel`],
        ['a wallet top-up', topup, h => `/client/v1/wallet/topups/${h.id}/cancel`],
    ])('cancels %s with its own call, then says to go again', async (_, holderOf, url) => {
        const holder = holderOf();
        axios.post.mockResolvedValue({status: 200, data: {}});
        const wrapper = mountFor(holder);

        await confirmRelease(wrapper);

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post.mock.calls[0][0]).toBe(url(holder));
        expect(wrapper.emitted('released')).toHaveLength(1);
    });

    it('names the payment it is about to cancel, and warns against cancelling one already paid', async () => {
        const wrapper = mountFor(transfer());

        await button(wrapper, 'Cancel it and continue').trigger('click');

        expect(wrapper.text()).toContain(`Your payment for ${transfer().reference} is still open. Cancel it and continue?`);
        expect(wrapper.text()).toContain("Don't cancel it if you've already sent the money for it.");
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('sends nothing when the customer keeps it', async () => {
        const wrapper = mountFor(transfer());

        await button(wrapper, 'Cancel it and continue').trigger('click');
        await button(wrapper, 'Keep it').trigger('click');

        expect(axios.post).not.toHaveBeenCalled();
        expect(wrapper.emitted('released')).toBeUndefined();
    });

    it('shows the api\'s reason and does not go again when the cancel is refused', async () => {
        const refusal = fixtureError('error-409-cancel-payment-not-open', 409);
        axios.post.mockRejectedValue(refusal);
        const wrapper = mountFor(transfer());

        await confirmRelease(wrapper);

        expect(wrapper.text()).toContain(refusal.response.data.message);
        expect(wrapper.emitted('released')).toBeUndefined();
    });

    it('offers nothing for an order without the payment\'s id, or a kind it does not know', () => {
        expect(mountFor({...hotel(), payment_id: null}).text()).toBe('');
        expect(mountFor({kind: 'standing_order', id: 'so-1', reference: 'SO-1'}).text()).toBe('');
        expect(mount(ReleaseHeldPayment, {props: {holder: null}}).text()).toBe('');
    });
});
