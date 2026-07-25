import CommissionAmount from "@/models/travel/hotels/commission_amount.js";

class CommissionInfo {
    /**
     * @type {CommissionAmount|null}
     */
    show = null;

    /**
     * @type {CommissionAmount|null}
     */
    charge = null;

    static getInstance(data) {
        const commissionInfo = new CommissionInfo();

        if (data.show) {
            commissionInfo.show = CommissionAmount.getInstance(data.show);
        }

        if (data.charge) {
            commissionInfo.charge = CommissionAmount.getInstance(data.charge);
        }

        return commissionInfo;
    }
}

export default CommissionInfo;