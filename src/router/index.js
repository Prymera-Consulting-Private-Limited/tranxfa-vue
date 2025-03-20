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
      path: '/workflow/onboarding',
      name: 'onboardingWorkflow',
      component: () => import('@/views/OnboardingWorkflowView.vue'),
      meta: {
        title: 'Complete Signup',
        description: 'Complete your profile with us.',
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
      path: '/transfer/:quoteId',
      name: 'transferWizard',
      props: route => ({ id: route.params.quoteId }),
      component: () => import('@/views/Transfer/Index.vue'),
      meta: {
        title: 'Send Money',
        description: '',
      },
    }, {
      path: '/pay/:transactionId',
      name: 'makePayment',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transfer/Payment.vue'),
      meta: {
        title: 'Make Payment',
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
      component: () => import('@/views/Recipient/Index.vue'),
      meta: {
        title: 'Recipients',
        description: '',
      },
    }, {
      path: '/recipient/:id',
      name: 'viewRecipient',
      component: () => import('@/views/Recipient/View.vue'),
      meta: {
        title: 'Recipients',
        description: '',
      },
    }, {
      path: '/account-verification',
      name: 'accountVerification',
      component: () => import('@/views/AccountVerification/IndexView.vue'),
      meta: {
        title: 'Account Verification',
        description: '',
      },
    }, {
      path: '/account-verification/upload/:category',
      name: 'categoryView',
      component: () => import('@/views/AccountVerification/CategoryView.vue'),
      meta: {
        title: 'Account Verification',
        description: '',
      },
    }, {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
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
