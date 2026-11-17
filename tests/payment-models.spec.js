import { describe, it, expect } from 'vitest'

import PaymentMethod from '@/models/payment_method.js'
import PaymentProvider from '@/models/payment_provider.js'
import PaymentDataAttribute from '@/models/payment_data_attribute.js'
import PaymentAccount from '@/models/payment_account.js'
import ClientPaymentAccount from '@/models/client_payment_account.js'
import ClientPaymentAccountAttribute from '@/models/client_payment_account_attribute.js'
import PaymentTransaction from '@/models/payment_transaction.js'
import PaymentTransactionState from '@/models/payment_transaction_state.js'
import MonthlyBudget from '@/models/monthly_budget.js'
import Currency from '@/models/currency.js'
import Country from '@/models/country.js'

describe('PaymentDataAttribute', () => {
    it('maps form metadata for a payment data requirement', () => {
        const attribute = PaymentDataAttribute.getInstance({
            attribute: 'card_number',
            type: 'text',
            label: 'Card number',
            input_mode: 'numeric',
            is_required: true,
            info: '16 digits',
            value: null,
        })

        expect(attribute.attribute).toBe('card_number')
        expect(attribute.type).toBe('text')
        expect(attribute.label).toBe('Card number')
        expect(attribute.inputMode).toBe('numeric')
        expect(attribute.isRequired).toBe(true)
        expect(attribute.info).toBe('16 digits')
        expect(attribute.value).toBeNull()
    })
})

describe('PaymentProvider', () => {
    it('maps fields and hydrates payment_data_requirements', () => {
        const provider = PaymentProvider.getInstance({
            id: 'pp-1',
            code: 'fincode',
            title: 'Fincode',
            description: 'Cards via Fincode',
            payment_data_requirements: [{ attribute: 'card_number', type: 'text' }],
        })

        expect(provider.id).toBe('pp-1')
        expect(provider.code).toBe('fincode')
        expect(provider.title).toBe('Fincode')
        expect(provider.description).toBe('Cards via Fincode')
        expect(provider.paymentDataAttributes).toHaveLength(1)
        expect(provider.paymentDataAttributes[0]).toBeInstanceOf(PaymentDataAttribute)
    })

    it('defaults paymentDataAttributes to empty when absent or empty', () => {
        expect(PaymentProvider.getInstance({ id: 'pp-2' }).paymentDataAttributes).toEqual([])
        expect(PaymentProvider.getInstance({ id: 'pp-3', payment_data_requirements: [] }).paymentDataAttributes).toEqual([])
    })
})

describe('PaymentMethod', () => {
    it('maps fields and hydrates providers', () => {
        const method = PaymentMethod.getInstance({
            id: 'pm-1',
            code: 'card',
            title: 'Card',
            description: 'Pay by card',
            providers: [{ id: 'pp-1', code: 'fincode' }],
        })

        expect(method.id).toBe('pm-1')
        expect(method.code).toBe('card')
        expect(method.providers[0]).toBeInstanceOf(PaymentProvider)
    })

    it('defaults providers to empty when absent', () => {
        expect(PaymentMethod.getInstance({ id: 'pm-2' }).providers).toEqual([])
    })
})

describe('PaymentAccount', () => {
    it('maps institution and account fields with nested country', () => {
        const account = PaymentAccount.getInstance({
            id: 'pa-1',
            country: { id: 'c-jp', iso2_alpha: 'JP' },
            institution: 'MUFG',
            institution_location_code: '001',
            account_holder_name: 'Tranxfa KK',
            account_number: '1234567',
        })

        expect(account.id).toBe('pa-1')
        expect(account.country).toBeInstanceOf(Country)
        expect(account.institution).toBe('MUFG')
        expect(account.institutionLocationCode).toBe('001')
        expect(account.accountHolderName).toBe('Tranxfa KK')
        expect(account.accountNumber).toBe('1234567')
    })
})

describe('ClientPaymentAccount', () => {
    it('maps instruction_text → instruction and hydrates attributes', () => {
        const account = ClientPaymentAccount.getInstance({
            id: 'cpa-1',
            institution_name: 'MUFG',
            instruction_text: 'Transfer to the account below',
            payment_reference: 42,
            wait_time_message: 'Allow 1 business day',
            attributes: [{ key: 'Account number', value: '1234567' }],
        })

        expect(account.id).toBe('cpa-1')
        expect(account.institutionName).toBe('MUFG')
        expect(account.instruction).toBe('Transfer to the account below')
        expect(account.paymentReference).toBe(42)
        expect(account.waitTimeMessage).toBe('Allow 1 business day')
        expect(account.attributes[0]).toBeInstanceOf(ClientPaymentAccountAttribute)
        expect(account.attributes[0].key).toBe('Account number')
        expect(account.attributes[0].value).toBe('1234567')
    })

    it('defaults attributes to empty when absent', () => {
        expect(ClientPaymentAccount.getInstance({ id: 'cpa-2' }).attributes).toEqual([])
    })
})

describe('PaymentTransaction', () => {
    const payload = () => ({
        id: 'pt-1',
        payment_account: { id: 'pa-1' },
        payment_method: { id: 'pm-1', code: 'card' },
        payment_provider: { id: 'pp-1', code: 'fincode' },
        shared_reference: 'REF-1',
        payment_url: 'https://pay.example/xyz',
        total_payment_amount: '10500',
        total_payment_amount_formatted: '10,500.00',
        total_payment_amount_currency_prefixed: '¥10,500',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
        customer_confirmed_payment: true,
        state: { id: 's-1', code: 'CAPTURED', color_scheme: 'green' },
        client_payment_account: { id: 'cpa-1' },
    })

    it('maps all fields and hydrates nested models', () => {
        const transaction = PaymentTransaction.getInstance(payload())

        expect(transaction.id).toBe('pt-1')
        expect(transaction.paymentAccount).toBeInstanceOf(PaymentAccount)
        expect(transaction.paymentMethod).toBeInstanceOf(PaymentMethod)
        expect(transaction.paymentProvider).toBeInstanceOf(PaymentProvider)
        expect(transaction.sharedReference).toBe('REF-1')
        expect(transaction.paymentUrl).toBe('https://pay.example/xyz')
        expect(transaction.totalPaymentAmount).toBe('10500')
        expect(transaction.totalPaymentAmountFormatted).toBe('10,500.00')
        expect(transaction.totalPaymentAmountCurrencyPrefixed).toBe('¥10,500')
        expect(transaction.createdAt).toBe('2026-01-01')
        expect(transaction.updatedAt).toBe('2026-01-02')
        expect(transaction.customerConfirmedPayment).toBe(true)
        expect(transaction.state).toBeInstanceOf(PaymentTransactionState)
        expect(transaction.clientPaymentAccount).toBeInstanceOf(ClientPaymentAccount)
    })

    it('keeps optional nested models null when absent', () => {
        const data = payload()
        delete data.payment_account
        delete data.state
        delete data.client_payment_account

        const transaction = PaymentTransaction.getInstance(data)

        expect(transaction.paymentAccount).toBeNull()
        expect(transaction.state).toBeNull()
        expect(transaction.clientPaymentAccount).toBeNull()
    })
})

describe('MonthlyBudget', () => {
    it('maps budget, spent, remaining and utilization with currency', () => {
        const budget = MonthlyBudget.getInstance({
            id: 'mb-1',
            budget: '100000',
            budget_formatted: '100,000.00',
            budget_formatted_currency_prefixed: '¥100,000',
            spent: '25000',
            spent_formatted: '25,000.00',
            spent_formatted_currency_prefixed: '¥25,000',
            remaining: '75000',
            remaining_formatted: '75,000.00',
            remaining_formatted_currency_prefixed: '¥75,000',
            utilization_percentage: '25',
            currency: { id: 'cur-jpy', code: 'JPY' },
        })

        expect(budget.id).toBe('mb-1')
        expect(budget.budget).toBe('100000')
        expect(budget.budgetFormatted).toBe('100,000.00')
        expect(budget.budgetFormattedCurrencyPrefixed).toBe('¥100,000')
        expect(budget.spent).toBe('25000')
        expect(budget.spentFormattedCurrencyPrefixed).toBe('¥25,000')
        expect(budget.remaining).toBe('75000')
        expect(budget.remainingFormattedCurrencyPrefixed).toBe('¥75,000')
        expect(budget.utilizationPercentage).toBe('25')
        expect(budget.currency).toBeInstanceOf(Currency)
    })

    it('keeps currency null when absent', () => {
        expect(MonthlyBudget.getInstance({ id: 'mb-2' }).currency).toBeNull()
    })
})
