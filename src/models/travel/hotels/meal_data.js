class MealData {
    /**
     * @type {string|null}
     */
    value = null;

    /**
     * @type {boolean|null}
     */
    hasBreakfast = null;

    /**
     * @type {boolean|null}
     */
    noChildMeal = null;

    static getInstance(data) {
        const mealData = new MealData();

        mealData.value = data.value;
        mealData.hasBreakfast = data.has_breakfast;
        mealData.noChildMeal = data.no_child_meal;

        return mealData;
    }
}

export default MealData;