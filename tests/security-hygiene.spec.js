import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import axios from "axios";
import {logRequestFailure} from "@/composables/api_utils.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import {useWalletStore} from "@/stores/wallet.js";
import {useCountriesStore} from "@/stores/countries.js";
import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import WalletAvailability from "@/enums/wallet_availability.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), defaults: {}}}));

describe('logging a failed request', () => {
    let spy;
    beforeEach(() => { spy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
    afterEach(() => spy.mockRestore());

    it('never writes the request body', () => {
        const error = Object.assign(new Error('Request failed with status code 422'), {
            config: {method: 'post', url: '/client/v1/login', data: JSON.stringify({email: 'a@b.c', password: 'hunter2'})},
            response: {status: 422, data: {message: 'Bad credentials'}},
        });

        logRequestFailure(error, 'sign-in');

        const written = spy.mock.calls.flat().map(String).join(' ');
        expect(written).toContain('POST /client/v1/login -> 422');
        expect(written).not.toContain('hunter2');
        expect(written).not.toContain('a@b.c');
    });
});

describe('signing out', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        globalThis.Echo = {disconnect: vi.fn()};
    });

    // Only the customer store was cleared, so the next sign-in on a shared
    // device inherited the previous customer's wallet.
    it('clears every store and drops the socket, even if the server errs', async () => {
        const customer = useCustomerStore(), wallet = useWalletStore(), countries = useCountriesStore(), policy = usePasswordPolicyStore();
        customer.isLoaded = true; customer.customer.data = {id: 'c1'};
        wallet.availability = WalletAvailability.ACTIVE; wallet.wallet.data = {balance: 5};
        countries.isLoaded = true; countries.add({id: 'AU'});
        policy.setPolicy({length: {value: 8}}); policy.setLoaded();
        axios.post.mockRejectedValue(new Error('500'));

        await expect(useCustomerUtils().logout()).rejects.toThrow('500');

        expect(customer.customer.data).toBeNull();
        expect(customer.isLoaded).toBe(false);
        expect(wallet.availability).toBe(WalletAvailability.UNKNOWN);
        expect(wallet.wallet.data).toBeNull();
        expect(countries.countries.data).toEqual([]);
        expect(policy.isLoaded).toBe(false);
        expect(globalThis.Echo.disconnect).toHaveBeenCalled();
    });

    it('clears the stores on a clean sign-out too', async () => {
        const customer = useCustomerStore();
        customer.isLoaded = true; customer.customer.data = {id: 'c1'};
        axios.post.mockResolvedValue({data: {}});

        await useCustomerUtils().logout();

        expect(customer.customer.data).toBeNull();
        expect(axios.post).toHaveBeenCalledWith('/client/v1/logout', {});
    });
});
