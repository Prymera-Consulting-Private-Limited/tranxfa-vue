import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount, RouterLinkStub} from '@vue/test-utils';
import {createPinia, setActivePinia} from 'pinia';
import axios from 'axios';
import {fixtureError} from './fixtures.js';
import {useCustomerStore} from '@/stores/customer.js';
import MultifactorAuthenticationView from '@/views/MultifactorAuthenticationView.vue';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {currentRoute: {value: {query: {}}}, push: vi.fn()}}));

// Console 2026.10.11: the fifth wrong MFA code locks the account and ends the
// session, answering 401 with a message that says so. The global 401 redirect
// used to take the customer to sign-in first, so the message was never seen.

const LOCKOUT = 'Too many incorrect codes. Your account is locked for 30 minutes.';

function rejection(status, data) {
    const response = {status, data};

    return Object.assign(new Error(`Request failed with status code ${status}`), {status, response, isAxiosError: true});
}

describe('the MFA screen when the API ends the session', () => {
    let store;

    beforeEach(() => {
        vi.clearAllMocks();
        setActivePinia(createPinia());
        store = useCustomerStore();
        store.customer.data = {account: {email: 'customer@example.com'}};
        store.isLoaded = true;
    });

    afterEach(() => vi.restoreAllMocks());

    async function submitWith(error) {
        axios.post.mockRejectedValue(error);
        const wrapper = mount(MultifactorAuthenticationView, {
            global: {stubs: {BrandLogo: true, VOtpInput: true, RouterLink: RouterLinkStub}},
        });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        return wrapper;
    }

    it('asks the API not to redirect, so the screen can answer the 401 itself', async () => {
        const wrapper = await submitWith(rejection(401, {message: LOCKOUT}));
        const [url, , config] = axios.post.mock.calls[0];
        expect(url).toBe('/client/v1/mfa');
        expect(config).toEqual({skipAuthRedirect: true});
        wrapper.unmount();
    });

    it('shows the lockout message and a way back to sign in, in place of the form', async () => {
        const wrapper = await submitWith(rejection(401, {message: LOCKOUT}));
        expect(wrapper.find('[role="alert"]').text()).toBe(LOCKOUT);
        expect(wrapper.find('form').exists()).toBe(false);
        const link = wrapper.findComponent(RouterLinkStub);
        expect(link.props('to')).toEqual({name: 'signIn', query: {}});
        expect(link.text()).toBe('Back to sign in');
        wrapper.unmount();
    });

    it('forgets the customer, whose session is over', async () => {
        const wrapper = await submitWith(rejection(401, {message: LOCKOUT}));
        expect(store.isLoaded).toBe(false);
        expect(store.customer.data).toBeNull();
        wrapper.unmount();
    });

    it('words an expired session itself rather than showing "Unauthenticated."', async () => {
        const wrapper = await submitWith(fixtureError('error-401-profile', 401));
        expect(wrapper.find('[role="alert"]').text()).toBe('Your session has ended. Please sign in again.');
        expect(wrapper.text()).not.toContain('Unauthenticated.');
        wrapper.unmount();
    });

    it('keeps the form for a wrong code that has not locked the account', async () => {
        const wrapper = await submitWith(rejection(422, {message: 'The code is incorrect. 2 attempts left.', errors: {otp: ['The code is incorrect.']}}));
        expect(wrapper.find('form').exists()).toBe(true);
        expect(wrapper.text()).toContain('The code is incorrect. 2 attempts left.');
        expect(store.isLoaded).toBe(true);
        wrapper.unmount();
    });
});
