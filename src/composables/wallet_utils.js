import Wallet from "@/models/wallet.js";
import WalletSubscription from "@/models/wallet_subscription.js";
import WalletAvailability from "@/enums/wallet_availability.js";
import {useWalletStore} from "@/stores/wallet.js";
import axios from "axios";

let probePromise = null;
export function useWalletUtils() {
    const walletStore = useWalletStore();

    function updateSubscription(data) {
        walletStore.subscription.data = WalletSubscription.getInstance(data);
        walletStore.availability = data.reacceptance_required === true
            ? WalletAvailability.PAUSED
            : WalletAvailability.ACTIVE;
    }

    /**
     * Resolves wallet availability from a single request. The un-enrolled 404
     * body carries type + wallet_offered; a 404 without a JSON type means the
     * deployment holds no wallet licence. Any other failure leaves the state
     * UNKNOWN, which renders nothing wallet-related.
     */
    async function probe() {
        if (probePromise) return probePromise;
        probePromise = axios.get('/client/v1/wallet/subscription')
            .then((response) => {
                updateSubscription(response.data);
            })
            .catch((e) => {
                if (e.response?.status === 404) {
                    const body = e.response.data;
                    walletStore.subscription.data = null;
                    walletStore.availability = (body?.type && body?.wallet_offered === true)
                        ? WalletAvailability.ELIGIBLE
                        : WalletAvailability.UNAVAILABLE;
                }
            })
            .finally(() => {
                probePromise = null;
            });

        return probePromise;
    }

    async function getTerms() {
        return axios.get('/client/v1/wallet/terms');
    }

    async function acceptTerms(termsVersionId) {
        return axios.post('/client/v1/wallet/subscription', {
            terms_version_id: termsVersionId,
        }).then((response) => {
            updateSubscription(response.data);
            return response;
        });
    }

    async function closeSubscription() {
        return axios.post('/client/v1/wallet/subscription/close', {}).then((response) => {
            walletStore.subscription.data = WalletSubscription.getInstance(response.data);
            walletStore.wallet.data = null;
            walletStore.availability = WalletAvailability.ELIGIBLE;
            return response;
        });
    }

    async function getWallet() {
        return axios.get('/client/v1/wallet').then((response) => {
            walletStore.wallet.data = Wallet.getInstance(response.data);
            walletStore.availability = response.data.reacceptance_required === true
                ? WalletAvailability.PAUSED
                : WalletAvailability.ACTIVE;
            return response;
        });
    }

    async function getMovements(page = 1) {
        return axios.get('/client/v1/wallet/movements', {
            params: {
                page: page,
            },
        });
    }

    async function getDepositInstructions() {
        return axios.get('/client/v1/wallet/deposit-instructions');
    }

    async function declareTopup(amount) {
        return axios.post('/client/v1/wallet/topups', {
            amount: amount,
        });
    }

    async function getTopups() {
        return axios.get('/client/v1/wallet/topups');
    }

    async function cancelTopup(topupId) {
        return axios.post(`/client/v1/wallet/topups/${topupId}/cancel`, {});
    }

    async function requestSpendOtp(quoteId) {
        return axios.post('/client/v1/wallet/spend-otp', {
            quote_id: quoteId,
        });
    }

    return {
        probe,
        getTerms,
        acceptTerms,
        closeSubscription,
        getWallet,
        getMovements,
        getDepositInstructions,
        declareTopup,
        getTopups,
        cancelTopup,
        requestSpendOtp,
    }
}
