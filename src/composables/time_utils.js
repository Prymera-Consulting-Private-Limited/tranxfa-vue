import moment from "moment";

export function useTimeUtils()
{
    const getNiceTime = (time) => {
        const instance = moment(time);

        if (instance.isAfter(moment().subtract(1, 'minute'))) {
            return 'Justo ahora';
        } else if (instance.isAfter(moment().subtract(5, 'minute'))) {
            return 'Hace unos minutos';
        } else if (instance.isAfter(moment().subtract(30, 'minute'))) {
            const minutes = moment().diff(instance, 'minutes');
            return `${minutes} minutos hace`;
        } else if (instance.isAfter(moment().subtract(2, 'hour'))) {
            return 'Hace una hora';
        } else if (instance.isAfter(moment().subtract(5, 'hour'))) {
            const hours = moment().diff(instance, 'hour');
            return `${hours} horas hace`;
        } else if (instance.isAfter(moment().subtract(1, 'day'))) {
            return instance.format('h:mm A');
        } else if (instance.isAfter(moment().subtract(1, 'week'))) {
            return instance.format('dddd');
        } else {
            return instance.format('MMM D, YYYY');
        }
    }

    return {
        getNiceTime,
    }
}