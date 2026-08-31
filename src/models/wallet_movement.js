class WalletMovement {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    postedAt = null;

    /**
     * @type {String|null}
     */
    description = null;

    /**
     * @type {String|null}
     */
    memo = null;

    /**
     * @type {String|null}
     */
    currency = null;

    /**
     * @type {String|null}
     */
    amount = null;

    /**
     * @type {String|null}
     */
    amountFormatted = null;

    /**
     * Presentation-only sign check; amounts arrive signed from the books.
     * @returns {Boolean}
     */
    isCredit() {
        return ! String(this.amount).startsWith('-');
    }

    static getInstance(data) {
        const movement = new WalletMovement();
        movement.id = data.id;
        movement.postedAt = data.posted_at;
        movement.description = data.description;
        movement.memo = data.memo;
        movement.currency = data.currency;
        movement.amount = data.amount;
        movement.amountFormatted = data.amount_formatted;
        return movement;
    }
}

export default WalletMovement;
