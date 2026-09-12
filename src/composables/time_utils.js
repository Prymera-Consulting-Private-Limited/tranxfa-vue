import moment from "moment";

/**
 * How long ago something happened, in the app's own language.
 *
 * The relative lines used to be hand-written, and in English word order:
 * "2 horas hace" rather than "hace 2 horas". moment already says this
 * correctly in every locale it ships, and main.js sets the locale from
 * VITE_APP_LOCALE, so moment does the talking. The absolute formats follow
 * the locale too (LT and ll) instead of the English h:mm A and MMM D, YYYY.
 */
export function useTimeUtils()
{
    const getNiceTime = (time) => {
        const instance = moment(time);

        // Anything inside five hours reads better as a relative phrase.
        if (instance.isAfter(moment().subtract(5, 'hour'))) {
            return instance.fromNow();
        }

        // Earlier today: the time on its own is enough.
        if (instance.isAfter(moment().subtract(1, 'day'))) {
            return instance.format('LT');
        }

        // Within the week: the weekday carries more than a date does.
        if (instance.isAfter(moment().subtract(1, 'week'))) {
            return instance.format('dddd');
        }

        return instance.format('ll');
    }

    return {
        getNiceTime,
    }
}
