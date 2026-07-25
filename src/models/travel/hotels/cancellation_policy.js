import CommissionInfo from "@/models/travel/hotels/commission_info.js";

class CancellationPolicy {
    /**
     * @type {string|null}
     */
    startAt = null;

    /**
     * @type {string|null}
     */
    endAt = null;

    /**
     * @type {string|null}
     */
    amountCharge = null;

    /**
     * @type {string|null}
     */
    amountShow = null;

    /**
     * @type {CommissionInfo|null}
     */
    commissionInfo = null;

    static getInstance(data) {
        const policy = new CancellationPolicy();

        policy.startAt = data.start_at;
        policy.endAt = data.end_at;
        policy.amountCharge = data.amount_charge;
        policy.amountShow = data.amount_show;

        if (data.commission_info) {
            policy.commissionInfo = CommissionInfo.getInstance(data.commission_info);
        }

        return policy;
    }
}

export default CancellationPolicy;