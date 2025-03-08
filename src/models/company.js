class Company {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    code = null;

    /**
     * @type {String|null}
     */
    title = null;

    static getInstance(data) {
        const company = new Company();
        company.id = data.id;
        company.code = data.code;
        company.title = data.title;
        return company;
    }
}

export default Company;