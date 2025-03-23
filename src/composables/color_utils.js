export function useColorUtils () {

    const getStyleValue = (value, variable) => {
        return `var(--color-${value}-${variable})`
    }

    const getStyleValueWithOpacityValue = (value, variable, opacity) => {
        return `var(--color-${value}-${variable}/${opacity})`
    }

    return {
        getStyleValue,
        getStyleValueWithOpacityValue,
    };
}