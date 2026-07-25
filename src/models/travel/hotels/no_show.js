class NoShow {
    /**
     * @type {string|null}
     */
    amount = null;

    /**
     * @type {string|null}
     */
    currencyCode = null;

    /**
     * @type {string|null}
     */
    fromTime = null;

    static getInstance(data) {
        const noShow = new NoShow();

        noShow.amount = data.amount;
        noShow.currencyCode = data.currency_code;
        noShow.fromTime = data.from_time;

        return noShow;
    }
}

export default NoShow;