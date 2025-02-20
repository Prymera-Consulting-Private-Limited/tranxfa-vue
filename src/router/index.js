import { createRouter, createWebHistory } from 'vue-router'
import SignUpView from "@/views/SignUpView.vue";
import SignInView from "@/views/SignInView.vue";
import EmailVerificationView from "@/views/EmailVerificationView.vue";
import EditIdentifyInfoView from "@/views/EditIdentifyInfoView.vue";

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
      component: EmailVerificationView,
      meta: {
        title: 'Verify Email',
        description: 'Verify your email',
      },
    }, {
      path: '/identity',
      name: 'updateIdentityInformation',
      component: EditIdentifyInfoView,
      meta: {
        title: 'Personal Details',
        description: '',
      },
    }, {
      path: '/dashboard',
      name: 'dashboard',
      component: EditIdentifyInfoView,
      meta: {
        title: 'Dashboard',
        description: '',
      },
    },
  ],
})

router.beforeEach((to, from) => {
  document.title = to.meta?.title ?? 'Default Title'
})

export default router
