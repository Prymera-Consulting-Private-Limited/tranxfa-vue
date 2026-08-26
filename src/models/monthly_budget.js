import Currency from "@/models/currency.js";

class MonthlyBudget {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    budget = null;

    /**
     * @type {String|null}
     */
    budgetFormatted = null;

    /**
     * @type {String|null}
     */
    budgetFormattedCurrencyPrefixed = null;

    /**
     * @type {String|null}
     */
    spent = null;

    /**
     * @type {String|null}
     */
    spentFormatted = null;

    /**
     * @type {String|null}
     */
    spentFormattedCurrencyPrefixed = null;

    /**
     * @type {String|null}
     */
    remaining = null;

    /**
     * @type {String|null}
     */
    remainingFormatted = null;

    /**
     * @type {String|null}
     */
    remainingFormattedCurrencyPrefixed = null;

    /**
     * @type {String|null}
     */
    utilizationPercentage = null;

    /**
     * @type {Currency|null}
     */
    currency = null;

    static getInstance(data) {
        const budget = new MonthlyBudget();
        budget.id = data.id;
        budget.budget = data.budget;
        budget.budgetFormatted = data.budget_formatted;
        budget.budgetFormattedCurrencyPrefixed = data.budget_formatted_currency_prefixed;
        budget.spent = data.spent;
        budget.spentFormatted = data.spent_formatted;
        budget.spentFormattedCurrencyPrefixed = data.spent_formatted_currency_prefixed;
        budget.remaining = data.remaining;
        budget.remainingFormatted = data.remaining_formatted;
        budget.remainingFormattedCurrencyPrefixed = data.remaining_formatted_currency_prefixed;
        budget.utilizationPercentage = data.utilization_percentage;
        if (data.currency) {
            budget.currency = Currency.getInstance(data.currency);
        }
        return budget;
    }
}

export default MonthlyBudget;