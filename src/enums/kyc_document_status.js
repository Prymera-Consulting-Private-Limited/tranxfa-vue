const KycDocumentStatus = Object.freeze({
    PENDING_VERIFICATION: 'pending-verification',
    PROCESSING: 'processing',
    REVIEW_REQUIRED: 'review-required',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    // Approved once, then withdrawn. Like rejected, the only way forward is a
    // new document.
    INVALIDATED: 'invalidated',
})

export default KycDocumentStatus