export function useColorUtils () {

    /**
     * @param {String} prefix
     * @param {String} color
     * @param {Number} variable
     * @returns {String}
     */
    const getClass = (prefix, color, variable) => {
        return `${prefix}-${color}-${variable}`;
    }

    /**
     * @param {String} prefix
     * @param {String} color
     * @param {Number} variable
     * @param {Number} opacity
     * @returns {String}
     */
    const getClassWithOpacity = (prefix, color, variable, opacity) => {
        return `${prefix}-${color}-${variable}/${opacity}`;
    }

    const getBgClass = (color, variable) => {
        return getClass('bg', color, variable);
    }

    const getBorderClass = (color, variable) => {
        return getClass('border', color, variable);
    }

    const getTextClass = (color, variable) => {
        return getClass('text', color, variable);
    }

    const getBgClassWithOpacity = (color, variable, opacity) => {
        return getClassWithOpacity('bg', color, variable, opacity);
    }

    const getBorderClassWithOpacity = (color, variable, opacity) => {
        return getClassWithOpacity('border', color, variable, opacity);
    }

    const getTextClassWithOpacity = (color, variable, opacity) => {
        return getClassWithOpacity('text', color, variable, opacity);
    }

    return {
        getClass,
        getClassWithOpacity,
        getBgClass,
        getBorderClass,
        getTextClass,
        getBgClassWithOpacity,
        getBorderClassWithOpacity,
        getTextClassWithOpacity,
    };
}