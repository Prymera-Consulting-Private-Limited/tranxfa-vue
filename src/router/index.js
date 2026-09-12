import {hotelsEnabled, walletEnabled} from '@/feature_flags.js'
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
    {
      path: '/contact',
      name: 'contact',
      component: () => import('@/views/ContactView.vue'),
      meta: {
        title: 'Contactar con soporte',
        description: 'Escríbenos por WhatsApp o correo electrónico.',
      },
    },
    {
      path: '/',
      name: 'signIn',
      component: SignInView,
      meta: {
        title: 'Iniciar sesión',
        description: 'Inicia sesión en tu cuenta',
      },
    }, {
      path: '/mfa',
      name: 'multiFactorAuth',
      component: () => import('@/views/MultifactorAuthenticationView.vue'),
      meta: {
        title: 'Se requiere autenticación adicional',
        description: 'Se requiere autenticación adicional',
      },
    }, {
      path: '/forgot-password',
      name: 'forgotPassword',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: {
        title: 'He olvidado mi contraseña',
        description: 'He olvidado mi contraseña',
      },
    }, {
      path: '/reset-password/:token',
      props: route => ({ token: route.params.token }),
      name: 'resetPassword',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: {
        title: 'Restablecer contraseña',
        description: 'Restablecer contraseña',
      },
    }, {
      path: '/secure-login',
      name: 'authByOtp',
      component: () => import('@/views/AuthByOtp.vue'),
      meta: {
        title: 'Verificación de inicio de sesión seguro',
        description: 'Verifica tu identidad con un código de un solo uso para continuar de forma segura.',
      },
    }, {
      path: '/sign-up',
      name: 'signUp',
      component: SignUpView,
      meta: {
        title: 'Crear cuenta',
        description: 'Registra tu cuenta',
      },
    }, {
      path: '/workflow/onboarding',
      name: 'onboardingWorkflow',
      component: () => import('@/views/OnboardingWorkflowView.vue'),
      meta: {
        title: 'Completar registro',
        description: 'Completa tu perfil con nosotros.',
      },
    }, {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: {
        title: 'Inicio',
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
        title: 'Hotels',
        description: '',
      },
    }, {
      path: '/travel/hotel/:id/:slug',
      name: 'viewHotel',
      props: route => ({ id: route.params.id, slug: route.params.slug, search: route.query.search }),
      component: () => import('@/views/Travel/Hotels/HotelView.vue'),
      meta: {
        title: 'Ver hotel',
        description: '',
      },
    }, {
      // The price held against a chosen rate, and what a booking is created from.
      path: '/travel/quote/:id',
      name: 'travelQuote',
      props: route => ({ quoteId: route.params.id }),
      component: () => import('@/views/Travel/Hotels/HotelQuoteView.vue'),
      meta: {
        title: 'Tu precio',
        description: '',
      },
    }, {
      // Bookings a customer already holds, as opposed to an attempt in flight.
      path: '/travel/bookings',
      name: 'travelBookings',
      component: () => import('@/views/Travel/Bookings/IndexView.vue'),
      meta: {
        title: 'Tus reservas',
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
        title: 'Tu pago',
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
        title: 'Paga tu reserva',
        description: '',
      },
    }, {
      path: '/travel/booking/:id',
      name: 'travelBooking',
      props: route => ({ orderId: route.params.id }),
      component: () => import('@/views/Travel/Bookings/ItemView.vue'),
      meta: {
        title: 'Booking',
        description: '',
      },
    }] : []),
    {
      path: '/transfer/:quoteId',
      name: 'transferWizard',
      props: route => ({ id: route.params.quoteId }),
      component: () => import('@/views/Transfer/IndexView.vue'),
      meta: {
        title: 'Enviar dinero',
        description: '',
      },
    }, {
      path: '/pay/:transactionId',
      name: 'makePayment',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transfer/PaymentView.vue'),
      meta: {
        title: 'Realizar el pago',
        description: '',
      },
    }, {
      path: '/payment/cb/:transactionId',
      name: 'paymentCallback',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transfer/PaymentCallbackView.vue'),
      meta: {
        title: 'Procesando el pago',
        description: '',
      },
    }, {
      path: '/transactions',
      name: 'transactions',
      component: () => import('@/views/Transaction/IndexView.vue'),
      meta: {
        title: 'Transacciones',
        description: '',
      },
    }, {
      path: '/transaction/:transactionId',
      name: 'viewTransaction',
      props: route => ({ id: route.params.transactionId }),
      component: () => import('@/views/Transaction/ItemView.vue'),
      meta: {
        title: 'Transacciones',
        description: '',
      },
    }, {
      path: '/recipients',
      name: 'recipients',
      component: () => import('@/views/Recipient/IndexView.vue'),
      meta: {
        title: 'Beneficiarios',
        description: '',
      },
    }, {
      path: '/recipient/:id',
      name: 'viewRecipient',
      props: route => ({ id: route.params.id }),
      component: () => import('@/views/Recipient/ItemView.vue'),
      meta: {
        title: 'Beneficiarios',
        description: '',
      },
    }, {
      path: '/account-verification',
      name: 'accountVerification',
      component: () => import('@/views/AccountVerification/IndexView.vue'),
      meta: {
        title: 'Verificación de cuenta',
        description: '',
      },
    }, {
      path: '/account-verification/upload/:category',
      name: 'categoryView',
      props: route => ({ id: route.params.category }),
      component: () => import('@/views/AccountVerification/CategoryView.vue'),
      meta: {
        title: 'Verificación de cuenta',
        description: '',
      },
    }, {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: {
        title: 'Configuración',
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
    // The wallet's own runtime guard is the documented probe of GET
    // /wallet/subscription; this is the deployment's hard off-switch.
    ...(walletEnabled() ? [{
      path: '/wallet',
      name: 'wallet',
      component: () => import('@/views/Wallet/IndexView.vue'),
      meta: {
        title: 'Monedero',
        description: '',
      },
    }, {
      path: '/wallet/statement',
      name: 'walletStatement',
      component: () => import('@/views/Wallet/StatementView.vue'),
      meta: {
        title: 'Extracto del monedero',
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
        title: 'Página no encontrada',
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
  document.title = to.meta?.title ?? APP_NAME
})

router.afterEach(() => {
  NProgress.done()
})

export default router
