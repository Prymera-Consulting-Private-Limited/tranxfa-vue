class Account {
    /**
     * @type {string|null}
     */
    email = null;

    /**
     * @type {boolean|null}
     */
    isEmailVerified = null;

    /**
     * @type {string|null}
     */
    passwordChangedAt = null;

    /**
     * @type {string|null}
     */
    createdAt = null;

    /**
     * @type {string|null}
     */
    updatedAt = null;

    static getInstance(data) {
        const account = new Account();
        account.email = data.email;
        account.isEmailVerified = data.is_email_verified;
        account.passwordChangedAt = data.password_changed_at;
        account.createdAt = data.created_at;
        account.updatedAt = data.updated_at;
        return account;
    }
}

export default Account;