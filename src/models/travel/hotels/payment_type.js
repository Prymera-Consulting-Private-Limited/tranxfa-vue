import VatData from "@/models/travel/hotels/vat_data.js";
import CommissionInfo from "@/models/travel/hotels/commission_info.js";
import CancellationPenalties from "@/models/travel/hotels/cancellation_penalties.js";

class PaymentType {
    /**
     * @type {string|null}
     */
    amount = null;

    /**
     * @type {string|null}
     */
    showAmount = null;

    /**
     * @type {string|null}
     */
    currencyCode = null;

    /**
     * @type {string|null}
     */
    showCurrencyCode = null;

    /**
     * @type {string|null}
     */
    by = null;

    /**
     * @type {boolean|null}
     */
    isNeedCreditCardData = null;

    /**
     * @type {boolean|null}
     */
    isNeedCvc = null;

    /**
     * @type {string|null}
     */
    type = null;

    /**
     * @type {VatData|null}
     */
    vatData = null;

    /**
     * @type {Array}
     */
    taxData = [];

    /**
     * @type {Array}
     */
    perks = [];

    /**
     * @type {CommissionInfo|null}
     */
    commissionInfo = null;

    /**
     * @type {CancellationPenalties|null}
     */
    cancellationPenalties = null;

    /**
     * @type {string|null}
     */
    recommendedPrice = null;

    static getInstance(data) {
        const paymentType = new PaymentType();

        paymentType.amount = data.amount;
        paymentType.showAmount = data.show_amount;
        paymentType.currencyCode = data.currency_code;
        paymentType.showCurrencyCode = data.show_currency_code;
        paymentType.by = data.by;
        paymentType.isNeedCreditCardData = data.is_need_credit_card_data;
        paymentType.isNeedCvc = data.is_need_cvc;
        paymentType.type = data.type;

        if (data.vat_data) {
            paymentType.vatData = VatData.getInstance(data.vat_data);
        }

        paymentType.taxData = data.tax_data ?? [];
        paymentType.perks = data.perks ?? [];

        if (data.commission_info) {
            paymentType.commissionInfo = CommissionInfo.getInstance(data.commission_info);
        }

        if (data.cancellation_penalties) {
            paymentType.cancellationPenalties = CancellationPenalties.getInstance(data.cancellation_penalties);
        }

        paymentType.recommendedPrice = data.recommended_price;

        return paymentType;
    }
}

export default PaymentType;