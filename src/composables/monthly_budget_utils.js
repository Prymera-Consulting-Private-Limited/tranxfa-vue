import axios from "axios";

export function useMonthlyBudgetUtils() {

    async function getCurrent() {
        return axios.get('/client/v1/monthly-budgets/current');
    }

    async function getHistory() {
        return axios.get('/client/v1/monthly-budgets/history');
    }

    async function createBudget(currency, amount) {
        return axios.post('/client/v1/monthly-budgets', {
            currency_id: currency,
            amount: amount,
        });
    }

    return {
        getCurrent,
        getHistory,
        createBudget,
    }
}