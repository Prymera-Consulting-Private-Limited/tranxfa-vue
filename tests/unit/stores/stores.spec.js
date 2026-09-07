import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useCountriesStore } from '@/stores/countries.js'
import { useCustomerStore } from '@/stores/customer.js'
import { usePasswordPolicyStore } from '@/stores/password_policy.js'

beforeEach(() => {
    setActivePinia(createPinia())
})

describe('countries store', () => {
    it('starts empty and unloaded', () => {
        const store = useCountriesStore()
        expect(store.isLoaded).toBe(false)
        expect(store.countries.data).toEqual([])
    })

    it('add() appends countries preserving order', () => {
        const store = useCountriesStore()
        store.add({ id: '1', commonName: 'Japan' })
        store.add({ id: '2', commonName: 'India' })
        expect(store.countries.data.map(c => c.id)).toEqual(['1', '2'])
    })
})

describe('customer store', () => {
    it('starts with no customer and unloaded', () => {
        const store = useCustomerStore()
        expect(store.isLoaded).toBe(false)
        expect(store.customer.data).toBeNull()
    })

    it('holds customer data reactively', () => {
        const store = useCustomerStore()
        store.customer.data = { id: 'abc' }
        store.isLoaded = true
        expect(store.customer.data.id).toBe('abc')
        expect(store.isLoaded).toBe(true)
    })
})

describe('password policy store', () => {
    it('starts unloaded with null policy and no rules', () => {
        const store = usePasswordPolicyStore()
        expect(store.isLoaded).toBe(false)
        expect(store.policy).toBeNull()
        expect(store.rules).toEqual([])
    })

    it('setLoaded() defaults to true and accepts an explicit flag', () => {
        const store = usePasswordPolicyStore()
        store.setLoaded()
        expect(store.isLoaded).toBe(true)
    })

    it('setPolicy() stores the object and defaults to null', () => {
        const store = usePasswordPolicyStore()
        store.setPolicy({ length: { value: 8 } })
        expect(store.policy).toEqual({ length: { value: 8 } })
        store.setPolicy()
        expect(store.policy).toBeNull()
    })

    it('builds rules for every configured policy entry', () => {
        const store = usePasswordPolicyStore()
        store.setPolicy({
            length: { value: 8, message: 'Min 8 chars', regex: '.{8,}' },
            uppercase: { value: true, message: 'One uppercase', regex: '[A-Z]' },
            lowercase: { value: true, message: 'One lowercase', regex: '[a-z]' },
            digits: { value: true, message: 'One digit', regex: '\\d' },
            wildcard: { value: true, message: 'One symbol', regex: '\\W' },
        })
        store.setLoaded()

        expect(store.rules.map(r => r.id)).toEqual(
            ['length', 'uppercase', 'lowercase', 'digits', 'wildcard'],
        )
        const lengthRule = store.rules.find(r => r.id === 'length')
        expect(lengthRule).toEqual({
            id: 'length', message: 'Min 8 chars', regex: '.{8,}', value: 8,
        })
    })

    it('skips rules whose value is falsy', () => {
        const store = usePasswordPolicyStore()
        store.setPolicy({
            length: { value: 10 },
            uppercase: { value: false },
            digits: {},
        })
        store.setLoaded()

        expect(store.rules.map(r => r.id)).toEqual(['length'])
    })

    it('returns no rules until the store is marked loaded', () => {
        const store = usePasswordPolicyStore()
        store.setPolicy({ length: { value: 8 } })
        expect(store.rules).toEqual([])
    })

    it('defaults message and regex to null when absent', () => {
        const store = usePasswordPolicyStore()
        store.setPolicy({ uppercase: { value: true } })
        store.setLoaded()
        expect(store.rules).toEqual([{ id: 'uppercase', message: null, regex: null }])
    })
})
