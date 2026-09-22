import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import axios from "axios";
import Monoova from "@/components/Payment/Monoova.vue";
import Transaction from "@/models/transaction.js";
import {installFakeEcho, makeTransactionPayload, modalStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));

const stubs = {...modalStubs, ClientPaymentAccount: true, UseClipboard: true};

const payload = state => {
    const p = makeTransactionPayload({stateCode: state, providerCode: 'MONOOVA'});
    p.payment.state.code = state;
    p.payment.shared_reference = 'REF-1';
    return p;
};

function mountMonoova(initialState) {
    const transaction = Transaction.getInstance(payload(initialState));

    return mount(Monoova, {props: {transaction}, global: {stubs}});
}

describe('a payment page that misses the broadcast', () => {
    let listeners;

    beforeEach(() => {
        vi.clearAllMocks();
        listeners = installFakeEcho();
    });

    afterEach(() => vi.useRealTimers());

    // The channel is only subscribed ~2.5s after the page starts loading, and the
    // backend flips the payment to PENDING inside that window. Before this, the
    // component subscribed and did nothing else, so the event landed in an empty
    // room and the customer waited forever.
    it('asks the server once immediately, so a missed broadcast still lands', async () => {
        axios.get.mockResolvedValue({data: payload('PENDING')});

        const wrapper = mountMonoova('INITIALIZED');
        await flushPromises();

        expect(axios.get, 'nothing was fetched after subscribing').toHaveBeenCalled();
        expect(wrapper.vm.transaction.payment.state.code).toBe('PENDING');
    });

    it('keeps asking while the payment is not ready yet', async () => {
        vi.useFakeTimers();
        axios.get.mockResolvedValue({data: payload('INITIALIZED')});

        mountMonoova('INITIALIZED');
        await flushPromises();
        const afterMount = axios.get.mock.calls.length;

        await vi.advanceTimersByTimeAsync(11_000);
        await flushPromises();

        expect(axios.get.mock.calls.length).toBeGreaterThan(afterMount);
    });

    // A hosted payment can reach PENDING with no payment_url when the provider
    // never hands one back (raised by the back office, not yet fixed there).
    // The page cannot mend that, but after a minute it stops looking like it
    // is about to.
    it('says when setup is taking longer than usual, and stops saying so once ready', async () => {
        vi.useFakeTimers();
        axios.get.mockResolvedValue({data: payload('INITIALIZED')});

        const wrapper = mountMonoova('INITIALIZED');
        await flushPromises();
        expect(wrapper.vm.isSlow).toBe(false);

        await vi.advanceTimersByTimeAsync(61_000);
        await flushPromises();
        expect(wrapper.vm.isSlow).toBe(true);

        axios.get.mockResolvedValue({data: payload('PENDING')});
        await vi.advanceTimersByTimeAsync(5_000);
        await flushPromises();
        expect(wrapper.vm.isSlow).toBe(false);
    });

    it('stops asking once the details can be shown', async () => {
        vi.useFakeTimers();
        axios.get.mockResolvedValue({data: payload('PENDING')});

        mountMonoova('INITIALIZED');
        await flushPromises();
        const settled = axios.get.mock.calls.length;

        await vi.advanceTimersByTimeAsync(30_000);
        await flushPromises();

        expect(axios.get.mock.calls.length, 'still polling after the payment was ready').toBe(settled);
    });

    // Becoming ready on a later poll, not the first one: this is the path that
    // has to cancel an interval that is already running.
    it('stops asking when a later poll is the one that finds it ready', async () => {
        vi.useFakeTimers();
        axios.get.mockResolvedValue({data: payload('INITIALIZED')});

        mountMonoova('INITIALIZED');
        await flushPromises();

        await vi.advanceTimersByTimeAsync(6_000);
        await flushPromises();
        const whilePolling = axios.get.mock.calls.length;
        expect(whilePolling, 'never started polling').toBeGreaterThan(1);

        axios.get.mockResolvedValue({data: payload('PENDING')});
        await vi.advanceTimersByTimeAsync(6_000);
        await flushPromises();
        const atReady = axios.get.mock.calls.length;

        await vi.advanceTimersByTimeAsync(30_000);
        await flushPromises();

        expect(axios.get.mock.calls.length, 'kept polling after it was ready').toBe(atReady);
    });

    // The old code cancelled the interval but not the request already in flight,
    // so an older snapshot could land after a broadcast and overwrite it - with
    // polling now cancelled, permanently.
    it('discards a fetch that a broadcast overtook', async () => {
        let release;
        axios.get.mockReturnValue(new Promise(resolve => { release = () => resolve({data: payload('INITIALIZED')}); }));

        const wrapper = mountMonoova('INITIALIZED');
        await flushPromises();

        // The broadcast wins the race.
        listeners[`client-payment.pay-1:PaymentTransactionStateUpdated`]({
            state: {id: 'st', code: 'PENDING', label: 'Pending', color_scheme: 'blue'},
            shared_reference: 'REF-1',
        });
        await flushPromises();
        expect(wrapper.vm.transaction.payment.state.code).toBe('PENDING');

        // The stale answer arrives afterwards and must not undo it.
        release();
        await flushPromises();

        expect(wrapper.vm.transaction.payment.state.code, 'a stale fetch overwrote a newer broadcast').toBe('PENDING');
    });

    // shared_reference is the reference the customer has to quote on the transfer.
    // Assigning it unconditionally meant a broadcast without the key erased it.
    it('never erases a field the broadcast does not mention', async () => {
        axios.get.mockResolvedValue({data: payload('INITIALIZED')});

        const wrapper = mountMonoova('INITIALIZED');
        await flushPromises();
        wrapper.vm.transaction.payment.sharedReference = 'REF-KEEP';

        listeners[`client-payment.pay-1:PaymentTransactionStateUpdated`]({
            state: {id: 'st', code: 'PENDING', label: 'Pending', color_scheme: 'blue'},
        });
        await flushPromises();

        expect(wrapper.vm.transaction.payment.sharedReference).toBe('REF-KEEP');
    });
});

describe('every payment provider', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const dir = path.join(process.cwd(), 'src', 'components', 'Payment');
    const providers = fs.readdirSync(dir).filter(f => f.endsWith('.vue'));

    // Ten components implemented this protocol by hand and five came out without
    // any fallback at all. The point of the composable is that there is one
    // implementation to get right.
    it.each(providers)('%s watches the payment through the composable', file => {
        const src = fs.readFileSync(path.join(dir, file), 'utf8');
        if (! src.includes('client-payment.') && ! src.includes('usePaymentWatch')) {
            return; // not a provider that watches a payment
        }

        expect(src, 'subscribes to Echo by hand instead of using usePaymentWatch').not.toMatch(/Echo\.channel\(/);
        expect(src, 'polls by hand instead of using usePaymentWatch').not.toMatch(/setInterval\(\s*getTransaction/);
        expect(src).toMatch(/usePaymentWatch\(/);
    });

    it.each(providers.filter(f => {
        const src = fs.readFileSync(path.join(dir, f), 'utf8');
        return src.includes('usePaymentWatch');
    }))('%s treats a failed payment as final', file => {
        const src = fs.readFileSync(path.join(dir, file), 'utf8');

        // FAILED was in none of the old terminal lists, so a failed payment kept
        // polling for as long as the customer looked at the error.
        expect(src).toMatch(/PaymentState\.FAILED/);
        expect(src).toMatch(/isFinal:/);
    });
});
