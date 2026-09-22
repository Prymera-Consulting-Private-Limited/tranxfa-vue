class Session {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {boolean|null}
     */
    isMfaCompleted = null;

    /**
     * @type {string|null}
     */
    sessionToken = null;

    /**
     * @type {string|null}
     */
    mfaMethod = null;

    /**
     * @type {string|null}
     */
    clientVersion = null;

    /**
     * @type {string|null}
     */
    osVersion = null;

    /**
     * @type {string|null}
     */
    touchedAt = null;

    /**
     * @type {string|null}
     */
    createdAt = null;

    /**
     * @type {string|null}
     */
    updatedAt = null;

    static getInstance(data) {
        const session = new Session();
        session.id = data.id;
        session.isMfaCompleted = data.is_mfa_completed;
        // The reference names it `token`; `session_token` was never sent.
        session.sessionToken = data.token ?? data.session_token ?? null;
        session.mfaMethod = data.mfa_method;
        session.clientVersion = data.client_version;
        session.osVersion = data.os_version;
        session.touchedAt = data.touched_at;
        session.createdAt = data.created_at;
        session.updatedAt = data.updated_at;
        return session;
    }
}

export default Session;