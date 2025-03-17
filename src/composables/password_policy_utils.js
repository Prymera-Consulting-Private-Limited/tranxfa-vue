import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import axios from "axios";

export function usePasswordPolicyUtils() {
    const passwordPolicyStore = usePasswordPolicyStore();

    async function getPolicy() {
        if (! passwordPolicyStore.isLoaded) {
            await axios.get('/client/v1/password-policy').then((response) => {
                passwordPolicyStore.setLoaded();
                passwordPolicyStore.setPolicy(response.data);
            }).catch((e) => {
                throw e;
            })
        }

        return passwordPolicyStore.policy;
    }

    return {
        getPolicy,
    }
}