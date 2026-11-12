class WalletTerms {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {Number|null}
     */
    version = null;

    /**
     * @type {String|null}
     */
    locale = null;

    /**
     * @type {String|null}
     */
    content = null;

    /**
     * @type {Boolean}
     */
    requiresReacceptance = false;

    /**
     * @type {String|null}
     */
    publishedAt = null;

    static getInstance(data) {
        const terms = new WalletTerms();
        terms.id = data.id;
        terms.version = data.version;
        terms.locale = data.locale;
        terms.content = data.content;
        terms.requiresReacceptance = data.requires_reacceptance === true;
        terms.publishedAt = data.published_at;
        return terms;
    }
}

export default WalletTerms;
