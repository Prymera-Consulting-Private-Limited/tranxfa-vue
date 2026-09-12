import {hotelsEnabled, walletEnabled} from '@/feature_flags.js'
import i18n from '@/i18n.js';
import { createRouter, createWebHistory } from 'vue-router'
import SignUpView from "@/views/SignUpView.vue";
import SignInView from "@/views/SignInView.vue";
import NProgress from 'nprogress'
import { createAuthGuard } from '@/router/guards.js'
import { useCustomerStore } from '@/stores/customer.js'
import { useCustomerUtils } from '@/composables/customer_utils.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Xenvia only: a contact page the other brands do not have.
    {
      path: '/contact',
      name: 'contact',
      component: () => import('@/views/ContactView.vue'),
      meta: {
        titleKey: 'routes.contact',
        description: 'Escríbenos por WhatsApp o correo electrónico.',
      },
    },
    {
      path: '/',
      name: 'signIn',
      component: SignInView,
      meta: {
        titleKey: 'routes.signIn',
        description: 'Login into your account',
      },
    }, {
      path: '/mfa',
      name: 'multiFactorAuth',
      component: () => import('@/views/MultifactorAuthenticationView.vue'),
      meta: {
        titleKey: 'routes.moreAuthenticationRequired',
        description: 'More authentication required',
      },
    }, {
      path: '/forgot-password',
      name: 'forgotPassword',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: {
        titleKey: 'routes.forgotPassword',
        description: 'Forgot Password',
      },
    }, {
      path: '/reset-password/:token',
      props: route => ({ token: route.params.token }),
      name: 'resetPassword',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: {
        titleKey: 'routes.resetPassword',
        description: 'Reset Password',
      },
    }, {
      path: '/secure-login',
      name: 'authByOtp',
      component: () => import('@/views/AuthByOtp.vue'),
      meta: {
        titleKey: 'routes.secureLoginVerification',
        description: 'Verify your identity with a one-time password to continue securely.',
      },
    }, {
      path: '/sign-up',
      name: 'signUp',
      component: SignUpView,
      meta: {
        titleKey: 'routes.signUp',
        description: 'Register your account',
      },
    }, {
      path: '/workflow/onboarding',
      name: 'onboardingWorkflow',
      component: () => import('@/views/OnboardingWorkflowView.vue'),
      meta: {
        titleKey: 'routes.completeSignup',
        description: 'Complete your profile with us.',
      },
    }, {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: {
        titleKey: 'routes.dashboard',
        description: '',
      },
    },
    // Hotels are licensed per deployment and the API answers 404 without the
    // licence; the routes exist only when VITE_HOTELS_ENABLED says so, so a
    // deep link on a brand without hotels reaches the not-found page.
    ...(hotelsEnabled() ? [{
      path: '/travel/hotels',
      name: 'hotels',
      component: () => import('@/views/Travel/Hotels/IndexView.vue'),
      meta: {
        titleKey: 'routes.hotels',
        description: '',
      },
    }, {
      path: '/travel/hotel/:id/:slug',
      name: 'viewHotel',
      props: route => ({ id: route.params.id, slug: route.params.slug, search: route.query.search }),
      component: () => import('@/views/Travel/Hotels/HotelView.vue'),
      meta: {
        titleKey: 'routes.viewHotel',
        description: '',
      },
    }, {
      // The price held against a chosen rate, and what a booking is created from.
      path: '/travel/quote/:id',
      name: 'travelQuote',
      props: route => ({ quoteId: route.params.id }),
      component: () => import('@/views/Travel/Hotels/HotelQuoteView.vue'),
      meta: {
        titleKey: 'routes.yourPrice',
        description: '',
      },
    }, {
      // Bookings a customer already holds, as opposed to an attempt in flight.
      path: '/travel/bookings',
      name: 'travelBookings',
      component: () => import('@/views/Travel/Bookings/IndexView.vue'),
      meta: {
        titleKey: 'routes.yourBookings',
        description: '',
      },
    }, {
      // Where a payment is watched until it settles. Reachable on its own so a
      // provider can be pointed back at it, and so a customer who closed the tab
      // has somewhere to return to.
      path: '/travel/booking/:id/payment',
      name: 'travelPaymentStatus',
      props: route => ({ orderId: route.params.id }),
      component: () => import('@/views/Travel/Bookings/PaymentStatusView.vue'),
      meta: {
        titleKey: 'routes.yourPayment',
        description: '',
      },
    }, {
      // Reached once a quote becomes a real booking. The room is already held,
      // so leaving this page loses the payment, never the booking.
      path: '/travel/booking/:id/pay',
      name: 'travelBookingPayment',
      props: route => ({ orderId: route.params.id }),
      component: () => import('@/views/Travel/Bookings/PaymentView.vue'),
      meta: {
        titleKey: 'routes.payForYourBooking',
        description: '',
      },
    }, {
      path: '/travel/booking/:id',
      name: 'travelBooking',
      props: route => ({ orderId: route.params.id }),
      component: () => import('@/views/Travel/Bookings/ItemView.vue'),
      meta: {
        titleKey: 'routes.booking',
        description: '',
      },
    }] : []),
    {
      path: '/transfer/:quoteId',
      name: 'transferWizard',
      props: route => ({ id: route.params.quoteId }),
      component: () => import('@/views/Transfer/IndexView.vue'),
      meta: {
        titleKey: 'routes.sendMoney',
        description: '',
      },
    }, {
      path: '/pay/:transactionId',
      name: 'makePayment',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transfer/PaymentView.vue'),
      meta: {
        titleKey: 'routes.makePayment',
        description: '',
      },
    }, {
      path: '/payment/cb/:transactionId',
      name: 'paymentCallback',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transfer/PaymentCallbackView.vue'),
      meta: {
        titleKey: 'routes.processingPayment',
        description: '',
      },
    }, {
      path: '/transactions',
      name: 'transactions',
      component: () => import('@/views/Transaction/IndexView.vue'),
      meta: {
        titleKey: 'routes.transactions',
        description: '',
      },
    }, {
      path: '/transaction/:transactionId',
      name: 'viewTransaction',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transaction/ItemView.vue'),
      meta: {
        titleKey: 'routes.transactions',
        description: '',
      },
    }, {
      path: '/recipients',
      name: 'recipients',
      component: () => import('@/views/Recipient/IndexView.vue'),
      meta: {
        titleKey: 'routes.recipients',
        description: '',
      },
    }, {
      path: '/recipient/:id',
      name: 'viewRecipient',
      props: route => ({ id: route.params.id }),
      component: () => import('@/views/Recipient/ItemView.vue'),
      meta: {
        titleKey: 'routes.recipients',
        description: '',
      },
    }, {
      path: '/account-verification',
      name: 'accountVerification',
      component: () => import('@/views/AccountVerification/IndexView.vue'),
      meta: {
        titleKey: 'routes.accountVerification',
        description: '',
      },
    }, {
      path: '/account-verification/upload/:category',
      name: 'categoryView',
      props: route => ({ id: route.params.category }),
      component: () => import('@/views/AccountVerification/CategoryView.vue'),
      meta: {
        titleKey: 'routes.accountVerification',
        description: '',
      },
    }, {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: {
        titleKey: 'routes.settings',
        description: '',
      },
    }, {
      path: '/devices',
      name: 'devices',
      component: () => import('@/views/DeviceView.vue'),
      meta: {
        titleKey: 'routes.devices',
        description: '',
      },
    },
    // The wallet's own runtime guard is the documented probe of GET
    // /wallet/subscription; this is the deployment's hard off-switch.
    ...(walletEnabled() ? [{
      path: '/wallet',
      name: 'wallet',
      component: () => import('@/views/Wallet/IndexView.vue'),
      meta: {
        titleKey: 'routes.wallet',
        description: '',
      },
    }, {
      path: '/wallet/statement',
      name: 'walletStatement',
      component: () => import('@/views/Wallet/StatementView.vue'),
      meta: {
        titleKey: 'routes.walletStatement',
        description: '',
      },
    }] : []),
    {
      // Anything unmatched. Without this an unknown address rendered an
      // empty RouterView titled "Default Title".
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: () => import('@/views/NotFoundView.vue'),
      meta: {
        titleKey: 'routes.pageNotFound',
        description: '',
      },
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, top: 16 }
    }
    return { top: 0 }
  },
})

const APP_NAME = import.meta.env.VITE_APP_NAME || 'RemitSo'

NProgress.configure({ showSpinner: false, trickleSpeed: 300 })

router.beforeEach((to, from, next) => {
  NProgress.start()
  next()
})

// Resolved inside the guard rather than at module load: the store needs the
// pinia the app installs, and this module is imported before that happens.
router.beforeEach((to) => {
  const guard = createAuthGuard({
    store: useCustomerStore(),
    // The interceptor's own 401 redirect would race the one this guard
    // returns and win without the redirect query.
    refresh: () => useCustomerUtils().refresh({skipAuthRedirect: true}),
  })
  return guard(to)
})

router.beforeEach((to, from) => {
  // The tab title is copy too, so it comes from the catalogue and follows the
  // brand's language rather than staying English.
  document.title = to.meta?.titleKey ? i18n.global.t(to.meta.titleKey) : APP_NAME
})

router.afterEach(() => {
  NProgress.done()
})

export default router
