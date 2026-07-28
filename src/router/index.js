import { createRouter, createWebHistory } from 'vue-router'
import SignUpView from "@/views/SignUpView.vue";
import SignInView from "@/views/SignInView.vue";
import NProgress from 'nprogress'

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
      path: '/secure-login',
      name: 'authByOtp',
      component: () => import('@/views/AuthByOtp.vue'),
      meta: {
        title: 'Secure Login Verification',
        description: 'Verify your identity with a one-time password to continue securely.',
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
      path: '/travel/hotels',
      name: 'hotels',
      component: () => import('@/views/Travel/Hotels/IndexView.vue'),
      meta: {
        title: 'Hotels',
        description: '',
      },
    }, {
      path: '/travel/hotel/:id/:slug',
      name: 'viewHotel',
      props: route => ({ id: route.params.id, slug: route.params.slug, search: route.query.search }),
      component: () => import('@/views/Travel/Hotels/HotelView.vue'),
      meta: {
        title: 'View Hotel',
        description: '',
      },
    }, {
      path: '/travel/hotel/quote/:id',
      name: 'hotelQuote',
      props: route => ({ id: route.params.id, search: route.query.search }),
      component: () => import('@/views/Travel/Hotels/QuoteView.vue'),
      meta: {
        title: 'Booking Summary',
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
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: {
        title: 'Settings',
        description: '',
      },
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

router.beforeEach((to, from) => {
  document.title = to.meta?.title ?? 'Default Title'
})

router.afterEach(() => {
  NProgress.done()
})

export default router
