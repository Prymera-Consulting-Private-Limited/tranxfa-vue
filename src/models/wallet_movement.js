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
     * One of the WalletMovementKind values — the stable machine value to
     * switch icons and colours on; description is localised free text.
     * @type {String|null}
     */
    kind = null;

    /**
     * @type {String|null}
     */
    description = null;

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
        movement.kind = data.kind;
        movement.description = data.description;
        movement.currency = data.currency;
        movement.amount = data.amount;
        movement.amountFormatted = data.amount_formatted;
        return movement;
    }
}

export default WalletMovement;
