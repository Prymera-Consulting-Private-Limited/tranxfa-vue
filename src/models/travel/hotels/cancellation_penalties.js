import CancellationPolicy from "@/models/travel/hotels/cancellation_policy.js";

class CancellationPenalties {
    /**
     * @type {CancellationPolicy[]}
     */
    policies = [];

    /**
     * @type {string|null}
     */
    freeCancellationBefore = null;

    static getInstance(data) {
        const cancellationPenalties = new CancellationPenalties();

        if (Array.isArray(data.policies)) {
            cancellationPenalties.policies = data.policies.map(policy =>
                CancellationPolicy.getInstance(policy)
            );
        }

        cancellationPenalties.freeCancellationBefore = data.free_cancellation_before;

        return cancellationPenalties;
    }
}

export default CancellationPenalties;