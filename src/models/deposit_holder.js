/**
 * The payment standing in the way of another one: `held_by` on a refusal whose
 * reason is account_held or same_amount. The same shape arrives from Pay Order
 * (409), a transfer's confirm (412) and a wallet load (412), so it is not
 * travel's or the wallet's to own.
 */
class DepositHolder {
    /**
     * See DepositHolderKind.
     *
     * @type {string|null}
     */
    kind = null;

    /**
     * The thing to open: the order, the transfer or the wallet load.
     *
     * @type {string|null}
     */
    id = null;

    /**
     * What a person would recognise it by: "VO-...", a transfer number, "WT...".
     *
     * @type {string|null}
     */
    reference = null;

    /**
     * The waiting payment itself, where the holder is an order. It is what
     * Cancel Order Payment takes beside the order's id.
     *
     * @type {string|null}
     */
    paymentId = null;

    /**
     * HOTELS or FLIGHTS for a service order, null for anything else.
     *
     * @type {string|null}
     */
    service = null;

    /**
     * @param {object|null|undefined} data Absent on every refusal that is not
     * about a held account, and from a console older than SD-1261.
     * @returns {DepositHolder|null}
     */
    static getInstance(data) {
        if (!data || typeof data !== 'object' || !data.kind || !data.id) {
            return null;
        }

        const holder = new DepositHolder();

        holder.kind = data.kind;
        holder.id = data.id;
        holder.reference = data.reference ?? null;
        holder.paymentId = data.payment_id ?? null;
        holder.service = data.service ?? null;

        return holder;
    }
}

export default DepositHolder;
