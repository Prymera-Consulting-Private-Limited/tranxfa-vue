import moment from "moment";

export function useTimeUtils()
{
    const getNiceTime = (time) => {
        const instance = moment(time);

        if (instance.isAfter(moment().subtract(1, 'minute'))) {
            return 'Just now';
        } else if (instance.isAfter(moment().subtract(5, 'minute'))) {
            return 'A few minutes ago';
        } else if (instance.isAfter(moment().subtract(30, 'minute'))) {
            const minutes = moment().diff(instance, 'minutes');
            return t('common.minutesMinutesAgo', {minutes: minutes});
        } else if (instance.isAfter(moment().subtract(2, 'hour'))) {
            return 'An hour ago';
        } else if (instance.isAfter(moment().subtract(5, 'hour'))) {
            const hours = moment().diff(instance, 'hour');
            return t('common.hoursHoursAgo', {hours: hours});
        } else if (instance.isAfter(moment().subtract(1, 'day'))) {
            return instance.format('LT');
        } else if (instance.isAfter(moment().subtract(1, 'week'))) {
            return instance.format('dddd');
        } else {
            return instance.format('ll');
        }
    }

    return {
        getNiceTime,
    }
}