import { describe, it, expect } from 'vitest'

import BaseTransaction from '@/models/base_transaction.js'
import BaseQuote from '@/models/base_quote.js'
import Quote from '@/models/quote.js'
import TransactionQuote from '@/models/transaction_quote.js'
import QuoteSource from '@/models/quote_source.js'
import QuoteTarget from '@/models/quote_target.js'
import Country from '@/models/country.js'
import Currency from '@/models/currency.js'
import PayoutMethod from '@/models/payout_method.js'
import Company from '@/models/company.js'
import Recipient from '@/models/recipient.js'
import PaymentMethod from '@/models/payment_method.js'
import QuotePendingDocument from '@/models/quote_pending_document.js'

const baseTransactionPayload = () => ({
    id: 'q-1',
    exchange_rate: '0.0095',
    exchange_rate_formatted: '1 JPY = 0.0095 USD',
    exchange_rate_is_inverse: false,
    base_fees: 500,
    base_fees_currency_prefixed: '¥500',
    base_fees_formatted: '500.00',
    local_amount: 10000,
    local_amount_currency_prefixed: '¥10,000',
    local_amount_formatted: '10,000.00',
    sub_total_amount_currency_prefixed: '¥10,500',
    sub_total_amount_formatted: '10,500.00',
    total_amount_currency_prefixed: '¥10,500',
    total_amount_formatted: '10,500.00',
    foreign_amount: 95,
    foreign_amount_currency_prefixed: '$95',
    foreign_amount_formatted: '95.00',
    payment_currency: { id: 'cur-jpy', code: 'JPY' },
    payment_country: { id: 'c-jp', iso2_alpha: 'JP' },
    payout_currency: { id: 'cur-usd', code: 'USD' },
    payout_country: { id: 'c-us', iso2_alpha: 'US' },
    payout_method: { id: 'pm-1', code: 'bank' },
    payout_company: { id: 'co-1', code: 'acme' },
})

describe('BaseTransaction.getInstance', () => {
    it('mutates the target object with mapped amounts and rates', () => {
        const target = new BaseTransaction()
        BaseTransaction.getInstance(target, baseTransactionPayload())

        expect(target.id).toBe('q-1')
        expect(target.exchangeRate).toBe('0.0095')
        expect(target.exchangeRateFormatted).toBe('1 JPY = 0.0095 USD')
        expect(target.exchangeRateIsInverse).toBe(false)
        expect(target.baseFees).toBe(500)
        expect(target.baseFeesCurrencyPrefixed).toBe('¥500')
        expect(target.baseFeesFormatted).toBe('500.00')
        expect(target.localAmount).toBe(10000)
        expect(target.localAmountCurrencyPrefixed).toBe('¥10,000')
        expect(target.subTotalAmountFormatted).toBe('10,500.00')
        expect(target.totalAmountCurrencyPrefixed).toBe('¥10,500')
        expect(target.foreignAmount).toBe(95)
        expect(target.foreignAmountCurrencyPrefixed).toBe('$95')
    })

    it('hydrates nested countries, currencies, method and company', () => {
        const target = new BaseTransaction()
        BaseTransaction.getInstance(target, baseTransactionPayload())

        expect(target.paymentCurrency).toBeInstanceOf(Currency)
        expect(target.paymentCountry).toBeInstanceOf(Country)
        expect(target.payoutCurrency).toBeInstanceOf(Currency)
        expect(target.payoutCountry).toBeInstanceOf(Country)
        expect(target.payoutMethod).toBeInstanceOf(PayoutMethod)
        expect(target.payoutCompany).toBeInstanceOf(Company)
    })

    it('falls back to payout_amount fields when foreign_amount is absent', () => {
        const target = new BaseTransaction()
        const payload = baseTransactionPayload()
        delete payload.foreign_amount
        delete payload.foreign_amount_currency_prefixed
        delete payload.foreign_amount_formatted
        payload.payout_amount = 96
        payload.payout_amount_currency_prefixed = '$96'
        payload.payout_amount_formatted = '96.00'

        BaseTransaction.getInstance(target, payload)

        expect(target.foreignAmount).toBe(96)
        expect(target.foreignAmountCurrencyPrefixed).toBe('$96')
        expect(target.foreignAmountFormatted).toBe('96.00')
    })
})

describe('BaseQuote.getInstance', () => {
    it('maps amount and amountType then applies BaseTransaction mapping', () => {
        const quote = new BaseQuote()
        BaseQuote.getInstance(quote, {
            ...baseTransactionPayload(),
            amount: '10000',
            amount_type: 'send',
        })

        expect(quote.amount).toBe('10000')
        expect(quote.amountType).toBe('send')
        expect(quote.exchangeRate).toBe('0.0095')
        expect(quote.paymentCurrency).toBeInstanceOf(Currency)
    })
})

describe('QuoteSource / QuoteTarget', () => {
    it.each([
        ['QuoteSource', QuoteSource],
        ['QuoteTarget', QuoteTarget],
    ])('%s hydrates country and currency', (name, Model) => {
        const instance = Model.getInstance({
            country: { id: 'c-1', iso2_alpha: 'JP' },
            currency: { id: 'cur-1', code: 'JPY' },
        })

        expect(instance.country).toBeInstanceOf(Country)
        expect(instance.currency).toBeInstanceOf(Currency)
    })
})

describe('Quote.getInstance', () => {
    const quotePayload = () => ({
        ...baseTransactionPayload(),
        amount: '10000',
        amount_type: 'send',
        require_payout_company_selection: true,
        transfer_disable_reason: null,
        exchange_rate_date: '2026-08-13',
        alerts: { info: 'Rates refreshed' },
        sources: [{ country: { id: 'c-jp' }, currency: { id: 'cur-jpy' } }],
        targets: [{ country: { id: 'c-us' }, currency: { id: 'cur-usd' } }],
        payout_methods: [{ id: 'pm-1', code: 'bank' }],
        payout_companies: [{ id: 'co-1', code: 'acme' }],
    })

    it('maps quote-specific fields and hydrates collections', () => {
        const quote = Quote.getInstance(quotePayload())

        expect(quote).toBeInstanceOf(Quote)
        expect(quote.requirePayoutCompanySelection).toBe(true)
        expect(quote.transferDisableReason).toBeNull()
        expect(quote.exchangeRateDate).toBe('2026-08-13')
        expect(quote.alerts).toEqual({ info: 'Rates refreshed' })
        expect(quote.sources[0]).toBeInstanceOf(QuoteSource)
        expect(quote.targets[0]).toBeInstanceOf(QuoteTarget)
        expect(quote.payoutMethods[0]).toBeInstanceOf(PayoutMethod)
        expect(quote.payoutCompanies[0]).toBeInstanceOf(Company)
        expect(quote.amount).toBe('10000')
        expect(quote.amountType).toBe('send')
    })

    it('leaves collections empty when the API sends empty arrays', () => {
        const payload = quotePayload()
        payload.sources = []
        payload.targets = []
        payload.payout_methods = []
        payload.payout_companies = []
        delete payload.alerts

        const quote = Quote.getInstance(payload)

        expect(quote.sources).toEqual([])
        expect(quote.targets).toEqual([])
        expect(quote.payoutMethods).toEqual([])
        expect(quote.payoutCompanies).toEqual([])
        expect(quote.alerts).toBeNull()
    })

    // Pins the current API contract: these arrays must be present (even if
    // empty) — the mapper reads .length without optional chaining.
    it('throws when the collection arrays are missing entirely', () => {
        const payload = quotePayload()
        delete payload.sources

        expect(() => Quote.getInstance(payload)).toThrow(TypeError)
    })
})

describe('TransactionQuote.getInstance', () => {
    const transactionQuotePayload = () => ({
        ...baseTransactionPayload(),
        amount: '10000',
        amount_type: 'send',
        recipients: [{ id: 'r-1', name: 'Hanako' }],
        recipient: { id: 'r-1', name: 'Hanako' },
        purposes: [{ id: 'p-1', title: 'Family support' }],
        payment_methods: [{ id: 'pm-1', code: 'card' }],
        pending_documents: [{ id: 'dc-1', code: 'poi', is_required: true }],
    })

    it('hydrates recipients, purposes, payment methods and pending documents', () => {
        const quote = TransactionQuote.getInstance(transactionQuotePayload())

        expect(quote).toBeInstanceOf(TransactionQuote)
        expect(quote.recipients[0]).toBeInstanceOf(Recipient)
        expect(quote.recipient).toBeInstanceOf(Recipient)
        expect(quote.purposes).toEqual([{ id: 'p-1', title: 'Family support' }])
        expect(quote.paymentMethods[0]).toBeInstanceOf(PaymentMethod)
        expect(quote.pendingDocuments[0]).toBeInstanceOf(QuotePendingDocument)
        expect(quote.pendingDocuments[0].isRequired).toBe(true)
    })

    it('handles a quote without recipient or optional collections', () => {
        const payload = transactionQuotePayload()
        payload.recipients = []
        delete payload.recipient
        delete payload.purposes
        delete payload.payment_methods
        delete payload.pending_documents

        const quote = TransactionQuote.getInstance(payload)

        expect(quote.recipients).toEqual([])
        expect(quote.recipient).toBeNull()
        expect(quote.purposes).toEqual([])
        expect(quote.paymentMethods).toEqual([])
        expect(quote.pendingDocuments).toEqual([])
    })

    // Pins the current API contract: recipients must always be an array.
    it('throws when recipients is missing entirely', () => {
        const payload = transactionQuotePayload()
        delete payload.recipients

        expect(() => TransactionQuote.getInstance(payload)).toThrow(TypeError)
    })
})
