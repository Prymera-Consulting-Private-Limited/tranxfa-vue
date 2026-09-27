import { describe, it, expect } from 'vitest'

import Transaction from '@/models/transaction.js'
import BaseTransaction from '@/models/base_transaction.js'
import Recipient from '@/models/recipient.js'
import TransactionState from '@/models/transaction_state.js'
import PaymentTransaction from '@/models/payment_transaction.js'
import PayoutTransaction from '@/models/payout_transaction.js'
import TransactionDocument from '@/models/transaction_document.js'

const payload = () => ({
    created_at: '2026-01-01',
    updated_at: '2026-01-02',
    transaction_number: 1001,
    recipient: { id: 'r-1', name: 'Hanako' },
    state: { id: 's-1', code: 'PENDING-PAYMENT', label: 'Pending payment' },
    payment: {
        id: 'pt-1',
        payment_method: { id: 'pm-1' },
        payment_provider: { id: 'pp-1' },
    },
    payout: { id: 'po-1' },
    pending_documents: [{ id: 'td-1', document_category: { id: 'dc-1' } }],
    exchange_rate: '0.0095',
    base_fees: 500,
    payment_currency: { id: 'cur-jpy', code: 'JPY' },
    payout_currency: { id: 'cur-usd', code: 'USD' },
})

describe('Transaction', () => {
    it('extends BaseTransaction and maps transaction fields', () => {
        const transaction = Transaction.getInstance(payload())

        expect(transaction).toBeInstanceOf(Transaction)
        expect(transaction).toBeInstanceOf(BaseTransaction)
        expect(transaction.createdAt).toBe('2026-01-01')
        expect(transaction.updatedAt).toBe('2026-01-02')
        expect(transaction.transactionNumber).toBe(1001)
        expect(transaction.exchangeRate).toBe('0.0095')
        expect(transaction.baseFees).toBe(500)
        expect(transaction.paymentCurrency.code).toBe('JPY')
        expect(transaction.payoutCurrency.code).toBe('USD')
    })

    it('hydrates recipient, state, payment, payout and pending documents', () => {
        const transaction = Transaction.getInstance(payload())

        expect(transaction.recipient).toBeInstanceOf(Recipient)
        expect(transaction.state).toBeInstanceOf(TransactionState)
        expect(transaction.state.code).toBe('PENDING-PAYMENT')
        expect(transaction.payment).toBeInstanceOf(PaymentTransaction)
        expect(transaction.payout).toBeInstanceOf(PayoutTransaction)
        expect(transaction.pendingDocuments[0]).toBeInstanceOf(TransactionDocument)
    })

    it('keeps optional relations null / empty when absent', () => {
        const data = payload()
        delete data.recipient
        delete data.payment
        delete data.payout
        delete data.pending_documents

        const transaction = Transaction.getInstance(data)

        expect(transaction.recipient).toBeNull()
        expect(transaction.payment).toBeNull()
        expect(transaction.payout).toBeNull()
        expect(transaction.pendingDocuments).toEqual([])
    })

    // Pins the current API contract: state is mandatory on every transaction.
    it('throws when state is missing', () => {
        const data = payload()
        delete data.state

        expect(() => Transaction.getInstance(data)).toThrow(TypeError)
    })
})
