import axios from "axios";

/**
 * Promotion coupons against a persisted quote (Client API reference,
 * "Promotion Coupons").
 *
 * Validate previews a code and always answers 200: an inapplicable code
 * comes back with is_valid false and a failure_reason written for the
 * customer. Apply binds the code and returns the repriced quote; a failure
 * is a 422 whose message is that same wording. Remove returns the quote at
 * its original pricing; a quote with no coupon answers 422.
 *
 * On a deployment without the licence the routes answer 404; the screens
 * are behind VITE_COUPONS_ENABLED so that is never reached in practice.
 */
export function useCouponUtils() {
    const validate = async (quoteId, couponCode) => {
        return axios.post(`/client/v1/quote/coupon/validate/${quoteId}`, {coupon_code: couponCode});
    }

    const apply = async (quoteId, couponCode) => {
        return axios.post(`/client/v1/quote/coupon/${quoteId}`, {coupon_code: couponCode});
    }

    const remove = async (quoteId) => {
        return axios.delete(`/client/v1/quote/coupon/${quoteId}`);
    }

    return {
        validate,
        apply,
        remove,
    }
}
