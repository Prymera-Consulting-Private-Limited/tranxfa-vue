class SalaryRange {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    title = null;

    static getInstance(data) {
        const salaryRange = new SalaryRange();
        salaryRange.id = data.id;
        salaryRange.title = data.title;
    }
}

export default SalaryRange;