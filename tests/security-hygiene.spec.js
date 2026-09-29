import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {readFileSync} from "node:fs";
import axios from "axios";
import {DOCUMENT_TYPES, IMAGE_TYPES, validateUpload} from "@/composables/upload_rules.js";
import {logRequestFailure} from "@/composables/api_utils.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import {useWalletStore} from "@/stores/wallet.js";
import {useCountriesStore} from "@/stores/countries.js";
import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import WalletAvailability from "@/enums/wallet_availability.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), defaults: {}}}));

// The multi-file upload accepted any type and checked only size; the single
// upload checked a browser-declared image type and no size.
describe('what a customer may upload', () => {
    const file = (type, mb = 1, name = 'id.jpg') => new File([new Uint8Array(mb * 1024 * 1024)], name, {type});

    it('accepts photos and PDFs of a document', () => {
        for (const type of DOCUMENT_TYPES) expect(validateUpload(file(type))).toBeNull();
    });

    it('refuses anything else, in words a customer can act on', () => {
        expect(validateUpload(file('text/html'))).toMatch(/JPEG, PNG or WebP photo, or a PDF/);
        expect(validateUpload(file('application/pdf'), {types: IMAGE_TYPES})).toMatch(/JPEG, PNG or WebP photo\.$/);
    });

    it('refuses a file over the size cap', () => {
        expect(validateUpload(file('image/jpeg', 11))).toMatch(/too large \(max 10 MB\)/);
        expect(validateUpload(file('image/jpeg', 9))).toBeNull();
    });

    it('is what the upload screens use', () => {
        const read = f => readFileSync(f, 'utf8');
        expect(read('src/components/AccountVerification/MultiFileUpload.vue')).toContain(':accept="accept"');
        expect(read('src/components/AccountVerification/MultiFileUpload.vue')).not.toContain('alert(');
        expect(read('src/components/AccountVerification/SingleFileUpload.vue')).toContain('validateUpload(file.file, {types: IMAGE_TYPES})');
        expect(read('src/components/AccountVerification/SingleFileUpload.vue')).not.toContain('accept="image/*"');
    });
});

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
