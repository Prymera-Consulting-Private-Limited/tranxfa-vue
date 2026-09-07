import { describe, it, expect } from 'vitest'

import Customer from '@/models/customer.js'
import Account from '@/models/account.js'
import Session from '@/models/session.js'
import Country from '@/models/country.js'
import CustomerAddress from '@/models/customer_address.js'
import CustomerAttribute from '@/models/customer_attribute.js'
import CustomerDocument from '@/models/customer_document.js'
import DocumentCategory from '@/models/document_category.js'
import CustomerAttributeCategory from '@/enums/customer_attribute_category.js'

const attribute = (category, { isRequired = true, value = null } = {}) => ({
    attribute: `${category}_attr`,
    category,
    is_required: isRequired,
    value,
})

describe('Customer.getInstance', () => {
    it('maps flat fields from snake_case', () => {
        const customer = Customer.getInstance({
            id: 'cust-1',
            crn: 12345,
            name: 'Taro',
            second_name: 'Jiro',
            third_name: 'Saburo',
            whole_name: 'Taro Jiro Saburo',
            unique_identity_number: 'UID-1',
            created_at: '2025-01-01',
            updated_at: '2025-06-01',
            poi_name_check: 'passed',
            is_blocked_for_sending: true,
        })

        expect(customer.id).toBe('cust-1')
        expect(customer.crn).toBe(12345)
        expect(customer.name).toBe('Taro')
        expect(customer.secondName).toBe('Jiro')
        expect(customer.thirdName).toBe('Saburo')
        expect(customer.wholeName).toBe('Taro Jiro Saburo')
        expect(customer.uniqueIdentityNumber).toBe('UID-1')
        expect(customer.createdAt).toBe('2025-01-01')
        expect(customer.updatedAt).toBe('2025-06-01')
        expect(customer.poiNameCheck).toBe('passed')
        expect(customer.isBlockedForSending).toBe(true)
    })

    it('hydrates nested models when present', () => {
        const customer = Customer.getInstance({
            id: 'cust-1',
            account: { email: 'a@b.c' },
            session: { id: 's-1' },
            country: { id: 'c-1' },
            nationality: { id: 'c-2' },
            address: { city: 'Tokyo' },
            attributes: [attribute('identity')],
            documents: [{ id: 'd-1' }],
            pending_documents: [{ id: 'cat-1' }],
        })

        expect(customer.account).toBeInstanceOf(Account)
        expect(customer.session).toBeInstanceOf(Session)
        expect(customer.country).toBeInstanceOf(Country)
        expect(customer.nationality).toBeInstanceOf(Country)
        expect(customer.address).toBeInstanceOf(CustomerAddress)
        expect(customer.attributes[0]).toBeInstanceOf(CustomerAttribute)
        expect(customer.documents[0]).toBeInstanceOf(CustomerDocument)
        expect(customer.pendingDocuments[0]).toBeInstanceOf(DocumentCategory)
    })

    it('defaults nested models to null / empty arrays when absent', () => {
        const customer = Customer.getInstance({ id: 'cust-1' })

        expect(customer.account).toBeNull()
        expect(customer.session).toBeNull()
        expect(customer.country).toBeNull()
        expect(customer.nationality).toBeNull()
        expect(customer.address).toBeNull()
        expect(customer.attributes).toEqual([])
        expect(customer.documents).toEqual([])
        expect(customer.pendingDocuments).toEqual([])
    })
})

describe.each([
    ['identityInformationRequired', CustomerAttributeCategory.IDENTITY],
    ['addressInformationRequired', CustomerAttributeCategory.ADDRESS],
    ['employmentInformationRequired', CustomerAttributeCategory.EMPLOYMENT],
])('Customer.%s', (method, category) => {
    it('is required when the customer has no country', () => {
        const customer = new Customer()
        expect(customer[method]()).toBe(true)
    })

    it('is required when a required attribute of the category has no value', () => {
        const customer = Customer.getInstance({
            id: 'cust-1',
            country: { id: 'c-1' },
            attributes: [attribute(category, { isRequired: true, value: null })],
        })
        expect(customer[method]()).toBe(true)
    })

    it('is not required when every required attribute has a value', () => {
        const customer = Customer.getInstance({
            id: 'cust-1',
            country: { id: 'c-1' },
            attributes: [attribute(category, { isRequired: true, value: 'filled' })],
        })
        expect(customer[method]()).toBe(false)
    })

    it('ignores optional attributes without values', () => {
        const customer = Customer.getInstance({
            id: 'cust-1',
            country: { id: 'c-1' },
            attributes: [attribute(category, { isRequired: false, value: null })],
        })
        expect(customer[method]()).toBe(false)
    })

    it('ignores unrelated categories', () => {
        const otherCategory = Object.values(CustomerAttributeCategory)
            .find((value) => value !== category)
        const customer = Customer.getInstance({
            id: 'cust-1',
            country: { id: 'c-1' },
            attributes: [attribute(otherCategory, { isRequired: true, value: null })],
        })
        expect(customer[method]()).toBe(false)
    })

    it('is not required when country is set and there are no attributes at all', () => {
        const customer = Customer.getInstance({
            id: 'cust-1',
            country: { id: 'c-1' },
        })
        expect(customer[method]()).toBe(false)
    })
})
