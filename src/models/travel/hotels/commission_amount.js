class CommissionAmount {
    /**
     * @type {string|null}
     */
    amountGross = null;

    /**
     * @type {string|null}
     */
    amountNet = null;

    /**
     * @type {string|null}
     */
    amountCommission = null;

    static getInstance(data) {
        const commissionAmount = new CommissionAmount();

        commissionAmount.amountGross = data.amount_gross;
        commissionAmount.amountNet = data.amount_net;
        commissionAmount.amountCommission = data.amount_commission;

        return commissionAmount;
    }
}

export default CommissionAmount;