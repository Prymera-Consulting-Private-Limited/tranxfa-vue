import { describe, it, expect } from 'vitest'

import AmountType from '@/enums/amount_type.js'
import ColorScheme from '@/enums/color_scheme.js'
import CustomerAttributeCategory from '@/enums/customer_attribute_category.js'
import CustomerTask from '@/enums/customer_task.js'
import CustomerTaskStatus from '@/enums/customer_task_status.js'
import KycDocumentStatus from '@/enums/kyc_document_status.js'
import PaymentState from '@/enums/payment_state.js'
import RecipientDataType from '@/enums/recipient_data_type.js'
import RecipientType from '@/enums/recipient_type.js'
import TransactionState from '@/enums/transaction_state.js'

describe('enums', () => {
    const frozenEnums = {
        AmountType,
        ColorScheme,
        CustomerAttributeCategory,
        CustomerTask,
        CustomerTaskStatus,
        KycDocumentStatus,
        PaymentState,
        RecipientDataType,
        RecipientType,
        TransactionState,
    }

    it.each(Object.entries(frozenEnums))('%s is frozen', (name, enumObject) => {
        expect(Object.isFrozen(enumObject)).toBe(true)
    })

    it.each(Object.entries(frozenEnums))('%s ignores mutation attempts', (name, enumObject) => {
        const firstKey = Object.keys(enumObject)[0]
        const original = enumObject[firstKey]
        expect(() => { enumObject[firstKey] = 'tampered' }).toThrow(TypeError)
        expect(enumObject[firstKey]).toBe(original)
    })

    describe('AmountType', () => {
        it('exposes send and receive', () => {
            expect(AmountType).toEqual({ SEND: 'send', RECEIVE: 'receive' })
        })
    })

    describe('ColorScheme', () => {
        it('exposes the six supported schemes', () => {
            expect(Object.values(ColorScheme).sort()).toEqual(
                ['blue', 'gray', 'green', 'orange', 'red', 'yellow'],
            )
        })
    })

    describe('CustomerAttributeCategory', () => {
        it('matches the categories used by Customer model logic', () => {
            expect(CustomerAttributeCategory).toEqual({
                IDENTITY: 'identity',
                ADDRESS: 'address',
                EMPLOYMENT: 'employment',
            })
        })
    })

    describe('CustomerTaskStatus', () => {
        it('covers the pending → in_progress → completed lifecycle', () => {
            expect(CustomerTaskStatus).toEqual({
                PENDING: 'pending',
                IN_PROGRESS: 'in_progress',
                COMPLETED: 'completed',
            })
        })
    })

    describe('KycDocumentStatus', () => {
        it('uses kebab-case status codes', () => {
            expect(Object.values(KycDocumentStatus)).toEqual([
                'pending-verification',
                'processing',
                'review-required',
                'approved',
                'rejected',
            ])
        })
    })

    describe('PaymentState', () => {
        it('keys mirror their values exactly', () => {
            for (const [key, value] of Object.entries(PaymentState)) {
                expect(value).toBe(key)
            }
        })

        it('contains the full payment lifecycle', () => {
            expect(Object.keys(PaymentState)).toEqual([
                'CREATED', 'INITIALIZED', 'PENDING', 'REDIRECTED', 'AUTHORIZED',
                'CAPTURED', 'FAILED', 'TIMED_OUT', 'PART_REFUNDED', 'REFUNDED', 'CANCELLED',
            ])
        })
    })

    describe('RecipientType', () => {
        it('exposes individual and business', () => {
            expect(RecipientType).toEqual({ INDIVIDUAL: 'individual', BUSINESS: 'business' })
        })
    })

    describe('TransactionState', () => {
        it('keys mirror their values exactly', () => {
            for (const [key, value] of Object.entries(TransactionState)) {
                expect(value).toBe(key)
            }
        })

        it('contains 21 states', () => {
            expect(Object.keys(TransactionState)).toHaveLength(21)
        })
    })

    describe('RecipientDataType', () => {
        it('contains every attribute input type used by recipient forms', () => {
            expect(Object.values(RecipientDataType)).toEqual(expect.arrayContaining([
                'text', 'select', 'radio', 'delivery_option', 'sub_delivery_option',
                'account_number', 'phone_number', 'mobile_number', 'email',
                'address_line_1', 'address_line_2', 'address_line_3',
                'address_city', 'address_region', 'address_postcode',
                'name', 'second_name', 'third_name',
            ]))
        })
    })
})
