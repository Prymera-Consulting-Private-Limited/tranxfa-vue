import { createRouter, createWebHistory } from 'vue-router'
import SignUpView from "@/views/SignUpView.vue";
import SignInView from "@/views/SignInView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'signIn',
      component: SignInView,
      meta: {
        title: 'Sign in',
        description: 'Login into your account',
      },
    }, {
      path: '/sign-up',
      name: 'signUp',
      component: SignUpView,
      meta: {
        title: 'Sign up',
        description: 'Register your account',
      },
    }, {
      path: '/email-verification',
      name: 'emailVerification',
      component: () => import('@/views/EmailVerificationView.vue'),
      meta: {
        title: 'Verify Email',
        description: 'Verify your email',
      },
    }, {
      path: '/onboarding/country',
      name: 'editAccountCountry',
      component: () => import('@/views/EditAccountCountryView.vue'),
      meta: {
        title: 'Country of Residence',
        description: '',
      },
    }, {
      path: '/identity',
      name: 'updateIdentityInformation',
      component: () => import('@/views/EditIdentifyInfoView.vue'),
      meta: {
        title: 'Personal Details',
        description: '',
      },
    }, {
      path: '/mobile-number',
      name: 'mobileNumberInput',
      component: () => import('@/views/MobileNumberInputView.vue'),
      meta: {
        title: 'Mobile Number',
        description: '',
      },
    }, {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: {
        title: 'Dashboard',
        description: '',
      },
    }, {
      path: '/transactions',
      name: 'transactions',
      component: () => import('@/views/TransactionListingView.vue'),
      meta: {
        title: 'Transactions',
        description: '',
      },
    }, {
      path: '/recipients',
      name: 'recipients',
      component: () => import('@/views/RecipientListingView.vue'),
      meta: {
        title: 'Recipients',
        description: '',
      },
    }, {
      path: '/account-verification',
      name: 'accountVerification',
      component: () => import('@/views/AccountVerification.vue'),
      meta: {
        title: 'Account Verification',
        description: '',
      },
    }, {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
      meta: {
        title: 'Settings',
        description: '',
      },
    },
  ],
})

router.beforeEach((to, from) => {
  document.title = to.meta?.title ?? 'Default Title'
})

export default router
