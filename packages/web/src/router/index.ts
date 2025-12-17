import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

// 路由守卫 - 使用 cookie 认证，通过 API 检查登录状态
router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAuth) {
    try {
      const res = await fetch('/api/auth/check', { credentials: 'include' });
      const data = await res.json();
      if (!data.authenticated) {
        next('/login');
        return;
      }
    } catch {
      next('/login');
      return;
    }
  }
  next();
});

export default router;
