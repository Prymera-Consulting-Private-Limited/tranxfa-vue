import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import {useCustomerStore} from "@/stores/customer.js";
import Customer from "@/models/customer.js";
import {authChannel, resolveOnboardingChannel} from "@/onboarding_config.js";
import {fixture} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));

const pinia = createPinia();
setActivePinia(pinia);
const {default: OnboardingWorkflowView} = await import("@/views/OnboardingWorkflowView.vue");

const stubs = {
    BrandLogo: true,
    OnboardingFlow: {name: 'OnboardingFlow', props: ['channel'], template: '<div data-flow />'},
};

function customer({email = 'someone@gmail.com', mobile = '412345678'} = {}) {
    const data = Customer.getInstance(fixture('profile-05-onboarded'));
    data.account.email = email;
    data.account.mobileNumber = mobile;

    return data;
}

function loadStore(data) {
    const store = useCustomerStore(pinia);
    store.isLoaded = true;
    store.customer.data = data;

    return store;
}

const mountView = () => mount(OnboardingWorkflowView, {global: {plugins: [pinia], stubs}});

describe('authChannel', () => {
    afterEach(() => vi.unstubAllEnvs());

    it.each([
        ['EMAIL', 'EMAIL'],
        ['MOBILE_NUMBER', 'MOBILE_NUMBER'],
        ['BOTH', 'BOTH'],
        ['both', 'BOTH'],
        [' both ', 'BOTH'],
    ])('normalises %j to %s', (raw, expected) => {
        vi.stubEnv('VITE_AUTH_CHANNEL', raw);
        expect(authChannel()).toBe(expected);
    });

    it('falls back to EMAIL for an unset or unrecognised value', () => {
        vi.stubEnv('VITE_AUTH_CHANNEL', '');
        expect(authChannel()).toBe('EMAIL');

        vi.stubEnv('VITE_AUTH_CHANNEL', 'sms');
        expect(authChannel()).toBe('EMAIL');
    });
});

describe('resolveOnboardingChannel', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('honours a fixed channel whatever the customer looks like', () => {
        vi.stubEnv('VITE_AUTH_CHANNEL', 'EMAIL');
        expect(resolveOnboardingChannel(customer({email: null}))).toBe('EMAIL');

        vi.stubEnv('VITE_AUTH_CHANNEL', 'MOBILE_NUMBER');
        expect(resolveOnboardingChannel(customer({email: 'x@gmail.com'}))).toBe('MOBILE_NUMBER');
    });

    describe('on a BOTH deployment', () => {
        beforeEach(() => vi.stubEnv('VITE_AUTH_CHANNEL', 'BOTH'));

        // BOTH is not a third flow - it means the brand accepts either signup,
        // so the answer depends on the customer in front of you.
        it('sends a customer who has an email down the email-first flow', () => {
            expect(resolveOnboardingChannel(customer({email: 'someone@gmail.com'}))).toBe('EMAIL');
        });

        // The bug this fixes: before, BOTH always chose the email-first machine,
        // which opens on emailVerification and guards on isEmailVerified. A
        // mobile signup has no email at all, so every PROCEED target failed and
        // the customer was stranded on a screen asking them to verify an email
        // they had never given.
        it('sends a customer with no email down the mobile-first flow', () => {
            expect(resolveOnboardingChannel(customer({email: null}))).toBe('MOBILE_NUMBER');
        });

        it('treats an empty email the same as none', () => {
            expect(resolveOnboardingChannel(customer({email: ''}))).toBe('MOBILE_NUMBER');
        });

        it('does not assume a profile is loaded', () => {
            expect(resolveOnboardingChannel(null)).toBe('MOBILE_NUMBER');
        });
    });
});

describe('OnboardingWorkflowView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const store = useCustomerStore(pinia);
        store.isLoaded = false;
        store.customer.data = null;
    });
    afterEach(() => vi.unstubAllEnvs());

    // The whole reason the flow lives in a child: useMachine runs once at
    // setup, so the machine must not be chosen before the profile says which
    // way this customer signed up.
    it('does not mount the flow until the profile has loaded', async () => {
        const axios = (await import('axios')).default;
        let resolveProfile;
        axios.get.mockReturnValue(new Promise((resolve) => {
            resolveProfile = resolve;
        }));

        const wrapper = mountView();
        await flushPromises();
        expect(wrapper.findComponent({name: 'OnboardingFlow'}).exists()).toBe(false);

        loadStore(customer());
        resolveProfile({status: 200, data: fixture('profile-05-onboarded')});
        await flushPromises();

        expect(wrapper.findComponent({name: 'OnboardingFlow'}).exists()).toBe(true);
    });

    // isLoading clearing is not the same as the profile arriving. A failed
    // fetch leaves the spinner off and the store empty, and mounting the flow
    // then would start a machine whose guards read a customer that is not
    // there.
    it('does not mount the flow when the profile fetch fails', async () => {
        const axios = (await import('axios')).default;
        axios.get.mockRejectedValue(Object.assign(new Error('boom'), {
            status: 500,
            response: {status: 500, data: {}},
        }));

        const wrapper = mountView();
        await flushPromises();

        expect(useCustomerStore(pinia).isLoaded).toBe(false);
        expect(wrapper.findComponent({name: 'OnboardingFlow'}).exists()).toBe(false);
        // Not a spinner forever: the customer is told, and offered a way out.
        expect(wrapper.text()).toContain('could not load your details');
        expect(wrapper.find('button').exists()).toBe(true);
    });

    it('recovers when the retry succeeds', async () => {
        const axios = (await import('axios')).default;
        axios.get.mockRejectedValueOnce(Object.assign(new Error('boom'), {
            status: 500,
            response: {status: 500, data: {}},
        }));

        const wrapper = mountView();
        await flushPromises();
        expect(wrapper.findComponent({name: 'OnboardingFlow'}).exists()).toBe(false);

        // The store is what refresh() populates on success.
        axios.get.mockImplementation(() => {
            loadStore(customer());

            return Promise.resolve({status: 200, data: fixture('profile-05-onboarded')});
        });
        await wrapper.get('button').trigger('click');
        await flushPromises();

        expect(wrapper.findComponent({name: 'OnboardingFlow'}).exists()).toBe(true);
    });

    it.each([
        ['BOTH', {email: 'someone@gmail.com'}, 'EMAIL'],
        ['BOTH', {email: null}, 'MOBILE_NUMBER'],
        ['EMAIL', {email: null}, 'EMAIL'],
        ['MOBILE_NUMBER', {email: 'someone@gmail.com'}, 'MOBILE_NUMBER'],
    ])('on %s with %o hands the flow channel %s', async (channel, account, expected) => {
        vi.stubEnv('VITE_AUTH_CHANNEL', channel);
        loadStore(customer(account));

        const wrapper = mountView();
        await flushPromises();

        expect(wrapper.getComponent({name: 'OnboardingFlow'}).props('channel')).toBe(expected);
    });

    it('does not refetch a profile the store already holds', async () => {
        const axios = (await import('axios')).default;
        loadStore(customer());

        mountView();
        await flushPromises();

        expect(axios.get).not.toHaveBeenCalled();
    });
});
