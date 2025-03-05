import {computed} from "vue";
import router from "@/router/index.js";

export function useNavigationUtils(snapshot, send) {
    const routeMap = {
        emailVerification: '/email-verification',
        editAccountCountry: '/onboarding/country',
        updateIdentityInformation: '/identity',
        mobileNumberInput: '/mobile-number',
        dashboard: '/dashboard'
    };

    const nextRoute = computed(() => {
        /**
         * @type {string|null}
         */
        const targetRoute = routeMap[snapshot?.value?.value] || null;
        if (targetRoute && router.currentRoute.value.path !== targetRoute) {
            return targetRoute;
        }

        return null;
    });

    async function redirectOnboarding (customer) {
        send({
            type: "SET_CONTEXT",
            isEmailVerified: customer.account.isEmailVerified
        });
        send({
            type: "SET_CONTEXT",
            accountCountry: customer.country?.id
        });
        send({
            type: "SET_CONTEXT",
            identityInfoProvided: !customer.identityInformationRequired(),
        });
        send({
            type: "SET_CONTEXT",
            mobileNumber: customer.mobileNumber,
        });
        send({ type: "PROCEED" })
        if (nextRoute.value) {
            await router.push(nextRoute.value);
        }
    }

    return {
        nextRoute,
        redirectOnboarding,
    }
}