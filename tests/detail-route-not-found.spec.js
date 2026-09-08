import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import axios from "axios";
import TransactionItemView from "@/views/Transaction/ItemView.vue";
import RecipientItemView from "@/views/Recipient/ItemView.vue";
import {installFakeEcho, modalStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), replace: vi.fn(), currentRoute: {value: {query: {}}}}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

const stubs = {...modalStubs, Calculator: true, RouterLink: {template: '<a><slot /></a>'}};

// Laravel with debug off answers an unresolvable route binding with this and no
// `exception` key, which is how it reached a customer on staging.
const notFound = () => Object.assign(new Error('Request failed with status code 404'), {
    response: {status: 404, data: {message: 'No query results for model [App\\Models\\Transaction] a0000000'}},
});

describe('a detail route reached with an id that does not resolve', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
    });

    // Before this the load rejected before isLoading could be cleared, so the
    // shimmer ran forever, and onMounted read transaction.data.id on null.
    it('tells the customer, on the transaction view', async () => {
        axios.get.mockRejectedValue(notFound());

        const wrapper = mount(TransactionItemView, {props: {id: 'a0000000'}, global: {stubs}});
        await flushPromises();

        expect(wrapper.text()).toContain("We couldn't load this transaction");
        // Never the framework's words.
        expect(wrapper.text()).not.toContain('No query results');
        expect(wrapper.text()).not.toContain('App\\Models');
    });

    // Before this the template read recipient.email on null in the not-loading
    // branch, so Vue threw during render and the customer got a blank page.
    it('tells the customer, on the recipient view', async () => {
        axios.get.mockRejectedValue(notFound());

        const wrapper = mount(RecipientItemView, {props: {id: 'a0000000'}, global: {stubs}});
        await flushPromises();

        expect(wrapper.text()).toContain("We couldn't load this recipient");
        expect(wrapper.text()).not.toContain('No query results');
    });

    it('shows a refusal the api wrote for a customer to read', async () => {
        axios.get.mockRejectedValue(Object.assign(new Error('failed'), {
            response: {status: 403, data: {message: 'This transfer belongs to another account.'}},
        }));

        const wrapper = mount(TransactionItemView, {props: {id: 'a0000000'}, global: {stubs}});
        await flushPromises();

        expect(wrapper.text()).toContain('This transfer belongs to another account.');
    });
});
