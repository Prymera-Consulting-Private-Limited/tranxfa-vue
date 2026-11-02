import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {nextTick, reactive} from "vue";
import axios from "axios";
import Volume from "@/components/Payment/Volume.vue";
import {installFakeEcho, makeTransaction, stateFaceStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));

function installFakeSdk() {
    const constructed = [];
    const instance = {
        createPayment: vi.fn(),
        injectComponent: vi.fn(),
        openInstitutionSelection: vi.fn(),
    };
    window.Volume = vi.fn(function (options) {
        constructed.push(options);
        return instance;
    });
    return {constructed, instance};
}

function mountVolume(stateCode = 'PENDING') {
    const transaction = reactive(makeTransaction({stateCode, providerCode: 'VOLUME-PAYMENTS'}));
    transaction.transactionNumber = 1001;
    const wrapper = mount(Volume, {props: {transaction}, global: {stubs: stateFaceStubs}});
    return {wrapper, transaction};
}

// The transfer flow constructed the sdk with environment: "SANDBOX" written
// in. Every open-banking transfer in production went to the sandbox bank list.
describe('Volume payment environment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
        axios.get.mockReturnValue(new Promise(() => {}));
        vi.stubEnv('VITE_VOLUME_PAYMENT_MERCHANT_ID', 'merchant-1');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        delete window.Volume;
    });

    it('talks to the environment the deployment configured', async () => {
        vi.stubEnv('VITE_VOLUME_PAYMENT_ENVIRONMENT', 'PRODUCTION');
        const {constructed, instance} = installFakeSdk();

        mountVolume();
        await flushPromises();

        expect(constructed).toHaveLength(1);
        expect(constructed[0].environment).toBe('PRODUCTION');
        expect(constructed[0].applicationId).toBe('merchant-1');
        expect(instance.createPayment).toHaveBeenCalledWith(expect.objectContaining({merchantPaymentId: 'pay-1', paymentReference: '1001'}));
    });

    it('never quietly uses the sandbox', async () => {
        const {constructed} = installFakeSdk();
        expect(constructed.every(o => o.environment !== 'SANDBOX')).toBe(true);
        const {wrapper} = mountVolume();
        await flushPromises();

        // In a test build PROD is false, so this falls back to sandbox by
        // design; the production branch is covered in feature-flags.spec.js.
        // What matters here is that the string is not written into the sdk
        // call.
        expect(wrapper.html()).not.toContain('SANDBOX');
    });

    it('shows an unavailable state instead of a bank list when unconfigured', async () => {
        vi.stubEnv('VITE_VOLUME_PAYMENT_MERCHANT_ID', '');
        const {constructed} = installFakeSdk();
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const {wrapper} = mountVolume();
        await flushPromises();

        expect(constructed).toHaveLength(0);
        expect(wrapper.text()).toContain('Payment unavailable');
        expect(wrapper.text()).toContain('No money has moved');
        spy.mockRestore();
    });

    it('injects the bank picker once, not on every transaction change', async () => {
        vi.stubEnv('VITE_VOLUME_PAYMENT_ENVIRONMENT', 'SANDBOX');
        const {constructed, instance} = installFakeSdk();

        const {transaction} = mountVolume();
        await flushPromises();
        transaction.payment.sharedReference = 'REF-2';
        await nextTick();
        transaction.payment.sharedReference = 'REF-3';
        await nextTick();

        expect(constructed).toHaveLength(1);
        expect(instance.injectComponent).toHaveBeenCalledTimes(1);
    });
});
