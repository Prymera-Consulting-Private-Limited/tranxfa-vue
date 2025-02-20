import {computed} from "vue";
import router from "@/router/index.js";

export function useNavigationUtils(snapshot) {
    const routeMap = {
        emailVerification: '/email-verification',
        updateIdentityInformation: '/identity',
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

    return {
        nextRoute,
    }
}