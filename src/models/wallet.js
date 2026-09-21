import WalletBalance from "@/models/wallet_balance.js";

class Wallet {
    /**
     * @type {String|null}
     */
    walletNumber = null;

    /**
     * @type {Boolean}
     */
    reacceptanceRequired = false;

    /**
     * @type {WalletBalance[]}
     */
    balances = [];

    /**
     * @param {String} currency
     * @returns {WalletBalance|null}
     */
    balanceFor(currency) {
        return this.balances.find(o => o.currency === currency) ?? null;
    }

    static getInstance(data) {
        const wallet = new Wallet();
        wallet.walletNumber = data.wallet_number;
        wallet.reacceptanceRequired = data.reacceptance_required === true;
        if (data.balances?.length > 0) {
            wallet.balances = data.balances.map(o => WalletBalance.getInstance(o));
        }
        return wallet;
    }
}

export default Wallet;
