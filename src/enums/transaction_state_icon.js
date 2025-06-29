import {
    ArrowUpIcon, // CREATED
    CreditCardIcon, // INITIATED, PENDING_PAYMENT, PAYMENT_CLEARED
    ExclamationTriangleIcon, // DOCUMENT_REQUIRED, ADDITIONAL_DOCUMENT_REQUIRED, UNDER_REVIEW
    DocumentCheckIcon, // DOCUMENT_PROVIDED, ADDITIONAL_DOCUMENT_PROVIDED
    ClipboardDocumentListIcon, // VERIFYING_DOCUMENT
    ClipboardDocumentCheckIcon, // DOCUMENT_VERIFIED
    ShieldCheckIcon, // RISK_ASSESSMENT
    ArrowPathIcon, // CONVERTING_FOREX
    CheckCircleIcon, // AVAILABLE_FOR_PAYOUT
    RocketLaunchIcon, // SENDING_FOR_PAYOUT
    TruckIcon, // SENT_FOR_PAYOUT
    TrophyIcon, // PAYOUT_SUCCESS
    FaceFrownIcon, // PAYOUT_FAILED
    ArrowUturnLeftIcon, // PAYOUT_REVERSED
    PauseCircleIcon, // ON_HOLD
    XMarkIcon // CANCELLED
} from '@heroicons/vue/24/outline';
import TransactionState from "@/enums/transaction_state.js";

const TransactionStateIcon = {
    [TransactionState.CREATED]: ArrowUpIcon,
    [TransactionState.INITIATED]: CreditCardIcon,
    [TransactionState['PENDING-PAYMENT']]: CreditCardIcon,
    [TransactionState['PAYMENT-CLEARED']]: CreditCardIcon,
    [TransactionState['DOCUMENT-REQUIRED']]: ExclamationTriangleIcon,
    [TransactionState['DOCUMENT-PROVIDED']]: DocumentCheckIcon,
    [TransactionState['ADDITIONAL-DOCUMENT-REQUIRED']]: ExclamationTriangleIcon,
    [TransactionState['ADDITIONAL-DOCUMENT-PROVIDED']]: DocumentCheckIcon,
    [TransactionState['VERIFYING-DOCUMENT']]: ClipboardDocumentListIcon,
    [TransactionState['RISK-ASSESSMENT']]: ClipboardDocumentListIcon,
    [TransactionState['DOCUMENT-VERIFIED']]: ClipboardDocumentCheckIcon,
    [TransactionState['RISK-ASSESSMENT']]: ShieldCheckIcon,
    [TransactionState['UNDER-REVIEW']]: ExclamationTriangleIcon,
    [TransactionState['CONVERTING-FOREX']]: ArrowPathIcon,
    [TransactionState['AVAILABLE-FOR-PAYOUT']]: CheckCircleIcon,
    [TransactionState['SENDING-FOR-PAYOUT']]: RocketLaunchIcon,
    [TransactionState['SENT-FOR-PAYOUT']]: TruckIcon,
    [TransactionState['PAYOUT-SUCCESS']]: TrophyIcon,
    [TransactionState['PAYOUT-FAILED']]: FaceFrownIcon,
    [TransactionState['PAYOUT-REVERSED']]: ArrowUturnLeftIcon,
    [TransactionState['ON-HOLD']]: ExclamationTriangleIcon,
    [TransactionState.CANCELLED]: XMarkIcon
};

export default TransactionStateIcon;
