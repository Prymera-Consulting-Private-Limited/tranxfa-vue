import { describe, it, expect } from 'vitest'

import DocumentType from '@/models/document_type.js'
import DocumentCategory from '@/models/document_category.js'
import CustomerDocument from '@/models/customer_document.js'
import QuotePendingDocument from '@/models/quote_pending_document.js'
import TransactionDocument from '@/models/transaction_document.js'

describe('DocumentType', () => {
    it('maps a full payload', () => {
        const type = DocumentType.getInstance({
            id: 'dt-1',
            code: 'passport',
            title: 'Passport',
            description: 'A valid passport',
            public_upload: true,
            info: 'Photo page only',
            document_number_label: 'Passport number',
            api: 'sumsub',
        })

        expect(type.id).toBe('dt-1')
        expect(type.code).toBe('passport')
        expect(type.title).toBe('Passport')
        expect(type.description).toBe('A valid passport')
        expect(type.publicUpload).toBe(true)
        expect(type.info).toBe('Photo page only')
        expect(type.documentNumberLabel).toBe('Passport number')
        expect(type.api).toBe('sumsub')
    })

    it('defaults publicUpload to false when absent', () => {
        const type = DocumentType.getInstance({ id: 'dt-2' })
        expect(type.publicUpload).toBe(false)
    })
})

describe('DocumentCategory', () => {
    it('maps fields and hydrates nested document types', () => {
        const category = DocumentCategory.getInstance({
            id: 'dc-1',
            code: 'poi',
            title: 'Proof of identity',
            description: 'Identity documents',
            document_types: [{ id: 'dt-1', code: 'passport' }],
        })

        expect(category.id).toBe('dc-1')
        expect(category.code).toBe('poi')
        expect(category.title).toBe('Proof of identity')
        expect(category.description).toBe('Identity documents')
        expect(category.documentTypes).toHaveLength(1)
        expect(category.documentTypes[0]).toBeInstanceOf(DocumentType)
        expect(category.documentTypes[0].code).toBe('passport')
    })

    it('defaults documentTypes to an empty array', () => {
        const category = DocumentCategory.getInstance({ id: 'dc-2' })
        expect(category.documentTypes).toEqual([])
    })
})

describe('CustomerDocument', () => {
    it('maps status fields and hydrates category and type', () => {
        const document = CustomerDocument.getInstance({
            id: 'doc-1',
            document_category: { id: 'dc-1', code: 'poi' },
            document_type: { id: 'dt-1', code: 'passport' },
            status_code: 'approved',
            status_title: 'Approved',
            created_at: '2025-01-01',
            updated_at: '2025-02-01',
        })

        expect(document.id).toBe('doc-1')
        expect(document.documentCategory).toBeInstanceOf(DocumentCategory)
        expect(document.documentType).toBeInstanceOf(DocumentType)
        expect(document.statusCode).toBe('approved')
        expect(document.statusTitle).toBe('Approved')
        expect(document.createdAt).toBe('2025-01-01')
        expect(document.updatedAt).toBe('2025-02-01')
    })

    it('keeps category and type null when absent', () => {
        const document = CustomerDocument.getInstance({ id: 'doc-2' })
        expect(document.documentCategory).toBeNull()
        expect(document.documentType).toBeNull()
    })
})

describe('QuotePendingDocument', () => {
    it('extends DocumentCategory and adds isRequired', () => {
        const pending = QuotePendingDocument.getInstance({
            id: 'dc-1',
            code: 'poi',
            title: 'Proof of identity',
            description: 'Identity documents',
            is_required: true,
            document_types: [{ id: 'dt-1' }],
        })

        expect(pending).toBeInstanceOf(DocumentCategory)
        expect(pending.isRequired).toBe(true)
        expect(pending.documentTypes[0]).toBeInstanceOf(DocumentType)
    })
})

describe('TransactionDocument', () => {
    it('maps fields and hydrates the document category', () => {
        const document = TransactionDocument.getInstance({
            id: 'td-1',
            created_at: '2025-01-01',
            updated_at: '2025-02-01',
            document_category: { id: 'dc-1', code: 'poi' },
        })

        expect(document.id).toBe('td-1')
        expect(document.createdAt).toBe('2025-01-01')
        expect(document.updatedAt).toBe('2025-02-01')
        expect(document.documentCategory).toBeInstanceOf(DocumentCategory)
        expect(document.documentCategory.code).toBe('poi')
    })
})
