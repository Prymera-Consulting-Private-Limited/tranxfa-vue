import axios from "axios";
import DepositHolderKind from "@/enums/deposit_holder_kind.js";

/**
 * Cancelling whatever payment holds the customer's deposit account, from
 * outside the screen it belongs to (SD-1423). A refusal names the payment in
 * the way in `held_by`, and each kind has its own cancel call.
 *
 * The order calls are written out here rather than borrowed from the travel
 * composables: checkout is reachable on a deployment without travel, and
 * nothing outside travel imports those (tests/i18n-catalogue.spec.js).
 */
export function useHeldPaymentUtils() {
    /**
     * @param {import('@/models/deposit_holder.js').default} holder
     * @returns {boolean} whether cancelHeldPayment has a call for it: a kind
     *   this app knows, and for an order the payment's id, which the call takes
     */
    const canCancel = (holder) => {
        switch (holder?.kind) {
            case DepositHolderKind.TRANSFER:
            case DepositHolderKind.WALLET_TOPUP:
                return true;

            case DepositHolderKind.SERVICE_ORDER:
                return !! holder.paymentId;

            default:
                return false;
        }
    }

    /**
     * 200 frees the account at once. A 409 means it is too late, or the gateway
     * cannot withdraw it, and carries a message for the customer.
     *
     * @param {import('@/models/deposit_holder.js').default} holder
     */
    const cancelHeldPayment = async (holder) => {
        switch (holder.kind) {
            case DepositHolderKind.TRANSFER:
                return axios.post(`/client/v1/transaction/payment/${holder.id}/cancel`);

            case DepositHolderKind.SERVICE_ORDER:
                return holder.service === 'FLIGHTS'
                    ? axios.post(`/client/v1/travel/flights/order/${holder.id}/payment/${holder.paymentId}/cancel`)
                    : axios.post(`/client/v1/travel/order/${holder.id}/payment/${holder.paymentId}/cancel`);

            case DepositHolderKind.WALLET_TOPUP:
                return axios.post(`/client/v1/wallet/topups/${holder.id}/cancel`, {});

            default:
                throw new Error(`No cancel for a ${holder.kind} holding the account`);
        }
    }

    return {
        canCancel,
        cancelHeldPayment,
    }
}
