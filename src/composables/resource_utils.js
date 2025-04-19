import axios from "axios";

export function useResourceUtils () {
    const relationships =  async () => {
        return axios.get('/client/v1/resources/relationships');
    }

    const occupations =  async () => {
        return axios.get('/client/v1/resources/occupations');
    }

    const currencySalaryRanges =  async () => {
        return axios.get('/client/v1/resources/currency-salary-ranges');
    }

    return {
        relationships,
        occupations,
        currencySalaryRanges,
    }
}