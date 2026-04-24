import { createRouter, createWebHistory } from 'vue-router'
import SignUpView from "@/views/SignUpView.vue";
import SignInView from "@/views/SignInView.vue";
import NProgress from 'nprogress'
import { comingSoonByFeature } from '@/config/coming_soon.js'

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
      path: '/mfa',
      name: 'multiFactorAuth',
      component: () => import('@/views/MultifactorAuthenticationView.vue'),
      meta: {
        title: 'More authentication required',
        description: 'More authentication required',
      },
    }, {
      path: '/forgot-password',
      name: 'forgotPassword',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: {
        title: 'Forgot Password',
        description: 'Forgot Password',
      },
    }, {
      path: '/reset-password/:token',
      props: route => ({ token: route.params.token }),
      name: 'resetPassword',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: {
        title: 'Reset Password',
        description: 'Reset Password',
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
      component: () => import('@/views/Transfer/IndexView.vue'),
      meta: {
        title: 'Send Money',
        description: '',
      },
    }, {
      path: '/pay/:transactionId',
      name: 'makePayment',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transfer/PaymentView.vue'),
      meta: {
        title: 'Make Payment',
        description: '',
      },
    }, {
      path: '/payment/cb/:transactionId',
      name: 'paymentCallback',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transfer/PaymentCallbackView.vue'),
      meta: {
        title: 'Processing Payment',
        description: '',
      },
    }, {
      path: '/transactions',
      name: 'transactions',
      component: () => import('@/views/Transaction/IndexView.vue'),
      meta: {
        title: 'Transactions',
        description: '',
      },
    }, {
      path: '/transaction/:transactionId',
      name: 'viewTransaction',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transaction/ItemView.vue'),
      meta: {
        title: 'Transactions',
        description: '',
      },
    }, {
      path: '/recipients',
      name: 'recipients',
      component: () => import('@/views/Recipient/IndexView.vue'),
      meta: {
        title: 'Recipients',
        description: '',
      },
    }, {
      path: '/recipient/:id',
      name: 'viewRecipient',
      props: route => ({ id: route.params.id }),
      component: () => import('@/views/Recipient/ItemView.vue'),
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
      props: route => ({ id: route.params.category }),
      component: () => import('@/views/AccountVerification/CategoryView.vue'),
      meta: {
        title: 'Account Verification',
        description: '',
      },
    }, {
      path: '/accounts',
      name: 'accounts',
      component: () => import('@/views/AccountsView.vue'),
      meta: {
        title: 'Accounts',
        description: 'Your profile and account details.',
      },
    }, {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: {
        title: 'Settings',
        description: '',
      },
    }, {
      path: '/support',
      name: 'support',
      component: () => import('@/views/SupportView.vue'),
      meta: {
        title: 'Support',
        description: 'Contact our team for help with your account and transfers.',
      },
    }, {
      path: '/coming-soon/:feature',
      name: 'comingSoon',
      props: true,
      component: () => import('@/views/ComingSoonView.vue'),
      meta: {
        title: 'Coming soon',
        description: '',
      },
    }, {
      path: '/rate-alerts',
      redirect: to => ({
        name: 'comingSoon',
        params: { feature: 'rate-alerts' },
        query: to.query,
        hash: to.hash,
      }),
    }, {
      path: '/devices',
      name: 'devices',
      component: () => import('@/views/DeviceView.vue'),
      meta: {
        title: 'Devices',
        description: '',
      },
    },
  ],
})

NProgress.configure({ showSpinner: false, trickleSpeed: 300 })

router.beforeEach((to, from, next) => {
  NProgress.start()
  next()
})

router.beforeEach((to) => {
  if (to.name === 'comingSoon' && to.params.feature) {
    const key = String(to.params.feature).toLowerCase()
    document.title = comingSoonByFeature[key]?.pageTitle ?? to.meta?.title ?? 'Coming soon'
  } else {
    document.title = to.meta?.title ?? 'Default Title'
  }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
