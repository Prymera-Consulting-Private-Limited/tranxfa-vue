export class CustomerTask {
    /**
     * @type {String|null}
     */
    id = null

    /**
     * @type {String|null}
     */
    title = null;

    /**
     * @type {String|null}
     */
    description = null;

    /**
     * @type {String|null}
     */
    status = null;

    static getInstance(data) {
        const instance = new CustomerTask();
        instance.id = data.id;
        instance.title = data.title;
        instance.description = data.description;
        instance.status = data.status;
        return instance
    }
}