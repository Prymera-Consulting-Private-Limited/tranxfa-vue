import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import {createI18n} from "vue-i18n";
import {readdirSync, readFileSync, statSync} from "node:fs";
import path from "node:path";
import axios from "axios";
import en from "@/locales/en.json";
import {fixture} from "./fixtures.js";
import {installFakeEcho, modalStubs} from "./helpers.js";
import {useCustomerStore} from "@/stores/customer.js";
import TransactionQuote from "@/models/transaction_quote.js";
import Transaction from "@/models/transaction.js";
import Confirm from "@/components/Transaction/Confirm.vue";
import PaymentMethodOptions from "@/components/Transaction/PaymentMethodOptions.vue";
import PaymentMethodRefusalType from "@/enums/payment_method_refusal_type.js";
import {getMethodRefusal} from "@/composables/payment_method_utils.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), currentRoute: {value: {fullPath: '/transfer/quote-1'}}}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

// SD-1792, the web half of SD-1790. From console 2026.10.6 a saved quote lists,
// for each way to pay, what that method adds to the base fee, the total paid
// that way, and the fee rule's smallest amount and multiple for it. The web
// app showed only the quote's own total, which is the figure before any
// method's fee: on staging it read 23.25 due while the payment was raised for
// 28.00. Installations keep per-method fees at zero until this ships.
//
// The wizard's navigation machine calls useCustomerStore() at module scope, so
// a pinia must be active before the view is imported.
const pinia = createPinia();
setActivePinia(pinia);
const {default: IndexView} = await import("@/views/Transfer/IndexView.vue");

const i18n = createI18n({legacy: false, locale: 'en', messages: {en}});

/**
 * A saved quote captured from Payvel staging on 17 Oct 2026, console 2026.10.6:
 * AUD 25 to a Fijian mobile wallet, Bank Transfer carrying a 4.75 fee, a 20.00
 * minimum and a 5.00 multiple, PayID nothing. The recipient's details are
 * replaced. A different amount sent is laid over it for the limit cases; the
 * methods' own totals stay as captured, since those cases never read them.
 */
function savedQuote({localAmount = null, bankTransfer = {}} = {}) {
    const data = fixture('quote-saved-method-fees');
    if (localAmount !== null) {
        data.local_amount = localAmount;
        data.local_amount_currency_prefixed = `AUD ${localAmount}`;
        data.sub_total_amount_currency_prefixed = `AUD ${localAmount}`;
        data.total_amount_currency_prefixed = `AUD ${localAmount}`;
    }
    data.payment_methods = data.payment_methods.map(method => (method.code === 'BANK-TRANSFER' ? {...method, ...bankTransfer} : method));
    return data;
}

const methodNamed = (quote, code) => quote.paymentMethods.find(m => m.code === code);

describe('a saved quote\'s ways to pay', () => {
    it('carry their fee, their total and their limits, as the API renders them', () => {
        const quote = TransactionQuote.getInstance(savedQuote());
        const bank = methodNamed(quote, 'BANK-TRANSFER');

        expect(bank.feeCurrencyPrefixed).toBe('AUD 4.75');
        expect(bank.totalAmountCurrencyPrefixed).toBe('AUD 29.75');
        expect(bank.minAmount).toBe('20.00');
        expect(bank.minAmountCurrencyPrefixed).toBe('AUD 20.00');
        expect(bank.amountMultiplier).toBe('5.00');
        expect(bank.amountMultiplierCurrencyPrefixed).toBe('AUD 5.00');
        expect(bank.hasFee).toBe(true);
    });

    it('say nothing of a fee when a method adds none, or when an older console sends none', () => {
        const quote = TransactionQuote.getInstance(savedQuote());
        expect(methodNamed(quote, 'PAY-ID').hasFee).toBe(false);

        // The captured quote is from before 2026.10.6: no fee, no total, no limits.
        const older = TransactionQuote.getInstance(fixture('quote-set-recipient'));
        for (const method of older.paymentMethods) {
            expect(method.fee).toBeNull();
            expect(method.totalAmountCurrencyPrefixed).toBeNull();
            expect(method.hasFee).toBe(false);
        }
    });

    it('put the method\'s fee on the transaction', () => {
        // The transfer that walk confirmed: its payment was raised for the
        // method's total, 29.75, not the quote's 25.00.
        const withFee = Transaction.getInstance(fixture('transaction-detail-method-fee'));
        expect(withFee.hasMethodFee).toBe(true);
        expect(withFee.methodFeeCurrencyPrefixed).toBe('AUD 4.75');
        expect(withFee.payment.totalPaymentAmountCurrencyPrefixed).toBe('AUD 29.75');

        expect(Transaction.getInstance({...fixture('transaction-detail'), method_fee: '0.00'}).hasMethodFee).toBe(false);
        expect(Transaction.getInstance(fixture('transaction-detail')).hasMethodFee).toBe(false);
    });
});

describe('a method\'s limits, checked the way Confirm Quote checks them', () => {
    const method = (minAmount, amountMultiplier) => ({minAmount, amountMultiplier});

    it('refuse an amount below the smallest one, and take the smallest itself', () => {
        expect(getMethodRefusal(method('20.00', null), '19.99')).toBe(PaymentMethodRefusalType.BELOW_MINIMUM);
        expect(getMethodRefusal(method('20.00', null), '20.00')).toBeNull();
        expect(getMethodRefusal(method('20.00', null), '20.5')).toBeNull();
    });

    it('refuse an amount off the multiple, in whole cents rather than floats', () => {
        expect(getMethodRefusal(method(null, '5.00'), '23.00')).toBe(PaymentMethodRefusalType.NOT_A_MULTIPLE);
        expect(getMethodRefusal(method(null, '5.00'), '25.00')).toBeNull();
        expect(getMethodRefusal(method(null, '5.00'), '25')).toBeNull();
        // 0.3 % 0.1 is not 0 in floating point.
        expect(getMethodRefusal(method(null, '0.10'), '0.30')).toBeNull();
        expect(getMethodRefusal(method(null, '0.10'), '0.35')).toBe(PaymentMethodRefusalType.NOT_A_MULTIPLE);
    });

    it('check the smallest amount first, as checkout does', () => {
        expect(getMethodRefusal(method('20.00', '5.00'), '13.00')).toBe(PaymentMethodRefusalType.BELOW_MINIMUM);
    });

    it('leave a method with no limits, or an amount it cannot read, to checkout', () => {
        expect(getMethodRefusal(method(null, null), '1.00')).toBeNull();
        expect(getMethodRefusal(method('20.00', '5.00'), null)).toBeNull();
        expect(getMethodRefusal(method('20.00', '5.00'), 'twenty')).toBeNull();
    });
});

describe('the list of ways to pay', () => {
    const mountOptions = (props) => mount(PaymentMethodOptions, {props, global: {plugins: [i18n]}});

    it('says what a method adds, and only for a method that adds something', () => {
        const quote = TransactionQuote.getInstance(savedQuote());
        const text = mountOptions({methods: quote.paymentMethods}).text();

        expect(text).toContain('Adds AUD 4.75');
        expect(text).not.toContain('AUD 0.00');
    });

    it('greys out a method the amount cannot use, with the limit, and will not choose it', async () => {
        const quote = TransactionQuote.getInstance(savedQuote({localAmount: '23.00'}));
        const bank = methodNamed(quote, 'BANK-TRANSFER');
        const wrapper = mountOptions({methods: quote.paymentMethods, refusals: {[bank.id]: PaymentMethodRefusalType.NOT_A_MULTIPLE}});

        expect(wrapper.text()).toContain('Only for amounts in multiples of AUD 5.00');
        const option = wrapper.findAll('[role="radio"]').find(o => o.text().includes(bank.title));
        expect(option.attributes('aria-disabled')).toBe('true');

        await option.trigger('click');
        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('names the smallest amount for a method below it', () => {
        const quote = TransactionQuote.getInstance(savedQuote({localAmount: '15.00'}));
        const bank = methodNamed(quote, 'BANK-TRANSFER');
        const text = mountOptions({methods: quote.paymentMethods, refusals: {[bank.id]: PaymentMethodRefusalType.BELOW_MINIMUM}}).text();

        expect(text).toContain('Available from AUD 20.00');
    });
});

describe('the confirm summary', () => {
    const mountConfirm = (props) => mount(Confirm, {props, global: {plugins: [i18n]}});

    it('asks for the chosen method\'s total and shows its fee beside the base fee', () => {
        const quote = TransactionQuote.getInstance(savedQuote());
        const text = mountConfirm({quote, paymentMethod: methodNamed(quote, 'BANK-TRANSFER')}).text();

        expect(text).toContain('Payment Method FeeAUD 4.75');
        expect(text).toContain('Total DueAUD 29.75');
        // The quote's subtotal is the amount and the base fee alone; beside a
        // method's fee it would add up to nothing on screen.
        expect(text).not.toContain('Subtotal');
    });

    it('keeps the quote\'s own lines for a method that adds nothing', () => {
        const quote = TransactionQuote.getInstance(savedQuote());
        const text = mountConfirm({quote, paymentMethod: methodNamed(quote, 'PAY-ID')}).text();

        expect(text).not.toContain('Payment Method Fee');
        expect(text).toContain('Subtotal');
        expect(text).toContain('Total DueAUD 25.00');
    });

    it('shows the quote\'s total until a method is chosen', () => {
        const quote = TransactionQuote.getInstance(savedQuote());
        const text = mountConfirm({quote}).text();

        expect(text).toContain('Total DueAUD 25.00');
        expect(text).not.toContain('AUD 29.75');
    });
});

describe('the wizard', () => {
    const wizardStubs = {
        ...modalStubs,
        Progress: true,
        RecipientListing: true,
        RecipientCardShimmer: true,
        AddRecipientWizard: true,
        QuoteDisplay: true,
        Confirm: true,
        PaymentMethodOptions: true,
        CustomerAttributeForm: true,
        DocumentTypeItem: true,
        CategoryDescription: true,
        SpendOtpModal: true,
        TermsModal: true,
        TopUpFlow: true,
        VSelect: true,
        HeldByAction: true,
    };

    async function mountWizard(payload) {
        const customerStore = useCustomerStore(pinia);
        customerStore.isLoaded = true;
        customerStore.customer.data = {
            addressInformationRequired: () => false,
            pendingDocuments: [],
            isBlockedForSending: false,
        };
        axios.get.mockResolvedValue({data: payload});
        const wrapper = mount(IndexView, {
            props: {id: payload.id},
            global: {plugins: [pinia], stubs: wizardStubs},
        });
        await flushPromises();
        return wrapper;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
    });

    it('greys out what the amount cannot use and lets the rest be chosen', async () => {
        const wrapper = await mountWizard(savedQuote({localAmount: '23.00'}));
        const bank = methodNamed(wrapper.vm.quote.data, 'BANK-TRANSFER');
        const payId = methodNamed(wrapper.vm.quote.data, 'PAY-ID');

        expect(wrapper.vm.methodRefusals).toEqual({[bank.id]: PaymentMethodRefusalType.NOT_A_MULTIPLE});
        expect(wrapper.vm.methodRefusals[payId.id]).toBeUndefined();
    });

    it('does not choose the only way to pay for the customer when the amount cannot use it', async () => {
        const below = savedQuote({localAmount: '15.00'});
        below.payment_methods = below.payment_methods.filter(m => m.code === 'BANK-TRANSFER');
        expect((await mountWizard(below)).vm.paymentMethod).toBeNull();

        const enough = savedQuote({localAmount: '25.00'});
        enough.payment_methods = enough.payment_methods.filter(m => m.code === 'BANK-TRANSFER');
        expect((await mountWizard(enough)).vm.paymentMethod?.code).toBe('BANK-TRANSFER');
    });

    it('keeps the chosen method on a repriced quote, at the new quote\'s total', async () => {
        const wrapper = await mountWizard(savedQuote());
        wrapper.vm.paymentMethod = methodNamed(wrapper.vm.quote.data, 'BANK-TRANSFER');
        await flushPromises();

        // Apply Coupon answers with the repriced quote, which the wizard takes whole.
        axios.post.mockResolvedValue({data: savedQuote({bankTransfer: {total_amount: '27.75', total_amount_currency_prefixed: 'AUD 27.75'}})});
        wrapper.vm.couponCode = 'FEEOFF';
        await wrapper.vm.applyCoupon();

        expect(wrapper.vm.paymentMethod.code).toBe('BANK-TRANSFER');
        expect(wrapper.vm.paymentMethod.totalAmountCurrencyPrefixed).toBe('AUD 27.75');
        expect(wrapper.vm.paymentMethod).toBe(methodNamed(wrapper.vm.quote.data, 'BANK-TRANSFER'));
    });

    it('lets a repriced quote take a method out of reach', async () => {
        const wrapper = await mountWizard(savedQuote());
        wrapper.vm.paymentMethod = methodNamed(wrapper.vm.quote.data, 'BANK-TRANSFER');
        await flushPromises();

        axios.post.mockResolvedValue({data: savedQuote({localAmount: '18.00'})});
        wrapper.vm.couponCode = 'BETTERRATE';
        await wrapper.vm.applyCoupon();

        expect(wrapper.vm.paymentMethod).toBeNull();
    });

    it('shows checkout\'s refusal of a method on its own, and greys that method out', async () => {
        const wrapper = await mountWizard(savedQuote());
        const bank = methodNamed(wrapper.vm.quote.data, 'BANK-TRANSFER');
        wrapper.vm.purpose = {id: 'purpose-1', title: 'Family support'};
        wrapper.vm.paymentMethod = bank;
        wrapper.vm.isStepProcessing = true;
        await flushPromises();

        const message = 'The smallest amount you can send paying by Bank Transfer is AUD 20.00. Please send at least that, or choose another payment method.';
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'payment_method_minimum', message, min_amount: '20.00', amount_multiplier: null}}});
        await wrapper.vm.confirmQuote();

        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.preconditionFailedMessage).toBe(message);
        expect(wrapper.vm.paymentMethod).toBeNull();
        expect(wrapper.vm.methodRefusals[bank.id]).toBe(PaymentMethodRefusalType.BELOW_MINIMUM);
    });

    it('greys out a method checkout says is no longer offered', async () => {
        const wrapper = await mountWizard(savedQuote());
        const payId = methodNamed(wrapper.vm.quote.data, 'PAY-ID');
        wrapper.vm.purpose = {id: 'purpose-1', title: 'Family support'};
        wrapper.vm.paymentMethod = payId;
        await flushPromises();

        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'payment_method_unavailable', message: 'This payment method is not available.'}}});
        await wrapper.vm.confirmQuote();

        expect(wrapper.vm.preconditionFailedMessage).toBe('This payment method is not available.');
        expect(wrapper.vm.methodRefusals[payId.id]).toBe(PaymentMethodRefusalType.UNAVAILABLE);
    });
});

// The ticket's own condition: no total is worked out in the app. A component
// that adds a method's fee to anything is how the 23.25 got on screen, so no
// view or component may do arithmetic on these amounts or parse them to.
describe('no amount is worked out in the browser', () => {
    const AMOUNT = '\\b(fee|totalAmount|minAmount|amountMultiplier|methodFee)\\b';
    const ARITHMETIC = [
        new RegExp(`(parseFloat|parseInt|Number)\\([^)]*${AMOUNT}`),
        new RegExp(`${AMOUNT}\\s*[-+*/%]\\s*[A-Za-z0-9_(]`),
        new RegExp(`[A-Za-z0-9_)]\\s*[-+*/%]\\s*[A-Za-z_.?]*${AMOUNT}`),
    ];

    const vueFiles = (dir) => readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) return vueFiles(full);
        return name.endsWith('.vue') ? [full] : [];
    });

    it('in any .vue file', () => {
        const files = vueFiles('src');
        expect(files.length).toBeGreaterThan(100);

        const offenders = files.flatMap(file => readFileSync(file, 'utf8').split('\n')
            .map((line, i) => (ARITHMETIC.some(pattern => pattern.test(line)) ? `${file}:${i + 1}` : null))
            .filter(Boolean));

        expect(offenders).toEqual([]);
    });
});
