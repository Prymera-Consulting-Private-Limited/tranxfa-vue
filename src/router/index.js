import { createRouter, createWebHistory } from 'vue-router'
import SignUpView from "@/views/SignUpView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/sign-up',
      name: 'signUp',
      component: SignUpView,
      meta: {
        title: 'Signup',
        description: 'Register your account',
      },
    },
  ],
})

router.beforeEach((to, from) => {
  document.title = to.meta?.title ?? 'Default Title'
})

export default router
