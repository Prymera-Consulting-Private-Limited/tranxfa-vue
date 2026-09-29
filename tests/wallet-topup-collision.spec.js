import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {modalStubs} from "./helpers.js";

const declareTopup = vi.fn();

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), defaults: {}}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), currentRoute: {value: {fullPath: '/wallet'}}}}));
vi.mock('@/composables/wallet_utils.js', () => ({useWalletUtils: () => ({declareTopup})}));

const {default: TopUpFlow} = await import("@/components/Wallet/TopUpFlow.vue");

// SD-1251. A wallet load answers 412 wallet_topup_amount_collides for the same
// two reasons a transfer checkout does. Only a same-amount collision is got
// round by declaring a different amount; a held account refuses every amount
// until the other payment is paid or cancelled. The console's message already gives the advice for its
// reason, so it is shown alone; our own wording is only for a refusal without
// one. A console older than 2026.09.2 sends no reason at all.
//
// The console's own wording (lang/en/message.php).
const SAME_AMOUNT = 'You already have a pending payment or load for exactly this amount. Please wait for it, cancel it, or choose a slightly different amount.';
const ACCOUNT_HELD = 'Another payment is still holding your account while we wait for it. Please pay it or cancel it first, or try again later.';
async function declareAndCollide(data) {
    declareTopup.mockRejectedValue({response: {status: 412, data: {type: 'wallet_topup_amount_collides', ...data}}});
    const wrapper = mount(TopUpFlow, {
        props: {open: true},
        global: {stubs: {...modalStubs, DialogTitle: {name: 'DialogTitle', template: '<h3><slot /></h3>'}, UseClipboard: true, ClientPaymentAccount: true, AwaitingPending: true, Spinner: true, RouterLink: true}},
    });
    await wrapper.find('input#topup-amount').setValue('250');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    return wrapper;
}

describe('a wallet load refused because the payment collides', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows the console message alone for a same-amount collision, with no second nudge', async () => {
        const wrapper = await declareAndCollide({reason: 'same_amount', message: SAME_AMOUNT});
        expect(wrapper.text()).toContain(SAME_AMOUNT);
        expect(wrapper.text()).not.toContain('Change the amount and try again.');
    });

    it('shows the console message alone when the account is held, never advising another amount', async () => {
        const wrapper = await declareAndCollide({reason: 'account_held', message: ACCOUNT_HELD});
        expect(wrapper.text()).toContain(ACCOUNT_HELD);
        expect(wrapper.text()).not.toContain('Change the amount');
        expect(wrapper.text()).not.toContain("Changing the amount won't help.");
    });

    it('shows the message alone when the console sends no reason', async () => {
        const wrapper = await declareAndCollide({message: SAME_AMOUNT});
        expect(wrapper.text()).toContain(SAME_AMOUNT);
        expect(wrapper.text()).not.toContain('Change the amount and try again.');
    });

    it('words each reason itself when the message is missing', async () => {
        const sameAmount = await declareAndCollide({reason: 'same_amount'});
        expect(sameAmount.text()).toContain('You already have a payment waiting for this exact amount. Change the amount and try again.');

        const held = await declareAndCollide({reason: 'account_held'});
        expect(held.text()).toContain("Another payment is still holding your account while we wait for it. Pay or cancel that payment first, or try again later. Changing the amount won't help.");
        // SD-1261: the hold lasts as long as the deployment sets, 30 hours on
        // Payvel, so our own words never name a time.
        expect(held.text()).not.toMatch(/hour/i);
        expect(held.text()).not.toContain('Change the amount and try again.');
    });

    it('gives neutral wording when there is neither a message nor a reason', async () => {
        const wrapper = await declareAndCollide({});
        expect(wrapper.text()).toContain("Another payment on your account is still open, so this deposit can't start yet.");
    });

    // SD-1269. Another wallet load is listed on the page behind this dialog,
    // where it can already be cancelled, so closing the dialog is how it is
    // reached. Any other holder is a screen to go to - see
    // tests/payment-held-by.spec.js for the button.
    it('closes onto the pending top-ups when another load is what holds the account', async () => {
        const wrapper = await declareAndCollide({
            reason: 'account_held',
            message: ACCOUNT_HELD,
            held_by: {kind: 'wallet_topup', id: 'topup-1', reference: 'WT2609180007', payment_id: null, service: null},
        });
        const view = wrapper.findAll('button').find(candidate => candidate.text() === 'View your wallet top-up');

        expect(view).toBeTruthy();
        await view.trigger('click');
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('offers no such button when the refusal does not name a holder', async () => {
        const wrapper = await declareAndCollide({reason: 'account_held', message: ACCOUNT_HELD});

        expect(wrapper.findAll('button').some(candidate => candidate.text().startsWith('View your'))).toBe(false);
    });
});
