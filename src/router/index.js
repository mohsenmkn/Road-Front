// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginView from '@/views/Auth/LoginView.vue';
import ForgotPasswordView from '@/views/Auth/ForgotPasswordView.vue';
import DashboardLayout from '@/components/layouts/DashboardLayout.vue';
import UsersView from '@/views/User/UsersView.vue';
import ForbiddenPage from '@/views/ForbiddenPage.vue';
import RoleList from '@/views/User/RoleList.vue';
import GroupsView from '@/views/Acl/GroupsView.vue';
import HomeDashboard from '@/views/HomeDashboard.vue';



const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      redirect: (to) => {
        const auth = useAuthStore()
        return { name: auth.defaultDashboard }
      }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: { requiresGuest: true }
    },
    {
      path: '/driver/trip',
      name: 'road-driver.trip',
      component: () => import('@/views/RoadTransport/DriverTripView.vue'),
      meta: { title: 'سفر راننده' }
    },
    {
      path: '/',
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: HomeDashboard,
          meta: { title: 'داشبورد' }
        },

        // ═══════════════════════════════════════════════
        // مدیریت کاربران و دسترسی‌ها
        // ═══════════════════════════════════════════════
        {
          path: 'users',
          name: 'users.index',
          component: UsersView,
          meta: {
            title: 'کاربران',
            permission: 'users.read'
          }
        },
        {
          path: 'roles',
          name: 'roles.index',
          component: RoleList,
          meta: {
            title: 'نقش‌ها',
            permission: 'roles.read'
          }
        },
        {
          path: 'groups',
          name: 'groups.index',
          component: GroupsView,
          meta: {
            title: 'گروه‌های کاربری',
            permission: 'groups.read'
          }
        },
        {
          path: 'road-transport/expenses',
          name: 'road-transport.expenses',
          component: () => import('@/views/RoadTransport/TripExpensesView.vue'),
          meta: { title: 'هزینه سفر جاده‌ای', permission: 'road_expenses.read' }
        },
        {
          path: 'road-transport/bill-financials',
          name: 'road-transport.bill-financials',
          component: () => import('@/views/RoadTransport/BillFinancialsView.vue'),
          meta: { title: 'داشبورد درآمد و هزینه بارنامه', permission: 'road_expenses.read' }
        },
        {
          path: 'road-transport/bill-financials/sync',
          name: 'road-transport.bita-sync',
          component: () => import('@/views/RoadTransport/BitaSyncView.vue'),
          meta: { title: 'همگام‌سازی بیتا', permission: 'road_expenses.read' }
        },
        {
          path: 'road-transport/bill-financials/income',
          name: 'road-transport.bill-financials.income',
          component: () => import('@/views/RoadTransport/BillFinancialsView.vue'),
          meta: { title: 'درآمدهای بارنامه', permission: 'road_expenses.read' }
        },
        {
          path: 'road-transport/bill-financials/costs',
          name: 'road-transport.bill-financials.costs',
          component: () => import('@/views/RoadTransport/BillFinancialsView.vue'),
          meta: { title: 'هزینه‌های کامیون', permission: 'road_expenses.read' }
        },
        {
          path: 'road-transport/bill-financials/entry',
          name: 'road-transport.bill-financials.entry',
          component: () => import('@/views/RoadTransport/BillFinancialsView.vue'),
          meta: { title: 'ورود اطلاعات درآمد', permission: 'road_manual_income.create' }
        },
        {
          path: 'road-transport/bill-financials/indirect-costs',
          name: 'road-transport.bill-financials.indirect-costs',
          component: () => import('@/views/RoadTransport/BillFinancialsView.vue'),
          meta: { title: 'هزینه‌های غیرمستقیم ناوگان', permission: 'road_indirect_cost.manage' }
        },
        {
          path: 'road-transport/expenses/:tripId',
          name: 'road-transport.expenses.detail',
          component: () => import('@/views/RoadTransport/TripExpenseDetailsView.vue'),
          meta: { title: 'جزئیات هزینه سفر', permission: 'road_expenses.read' }
        },
        {
          path: 'road-transport/routes',
          name: 'road-transport.routes',
          component: () => import('@/views/RoadTransport/RoutesView.vue'),
          meta: { title: 'تنظیم مسیرها', permission: 'road_expenses.manage_categories' }
        },
        {
          path: 'road-transport/expense-categories',
          name: 'road-transport.expense-categories',
          component: () => import('@/views/RoadTransport/ExpenseCategoriesView.vue'),
          meta: { title: 'سقف هزینه‌ها', permission: 'road_expenses.manage_categories' }
        },
        {
          path: '/profile',
          name: 'profile',
          component: () => import('@/views/User/Profile.vue'),
          meta: {
            title: 'پروفایل من',
            requiresAuth: true
          }
        },
        {
          path: '/settings',
          name: 'settings',
          component: () => import('@/views/User/Settings.vue'),
          meta: {
            title: 'تنظیمات',
            requiresAuth: true
          }
        },



        // 403
        {
          path: '403',
          name: 'forbidden',
          component: ForbiddenPage
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundPage.vue')
    }
  ]
});

// ═══════════════════════════════════════════════
// Router Guards
// ═══════════════════════════════════════════════
// src/router/index.js (بخش guard)

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // ✅ اطمینان از لود شدن auth
  if (!auth.loaded) {
    await auth.initAuth();
  }

  // The root redirect can run before persisted auth finishes loading. Correct
  // its fallback destination once the user's role is known.
  if (auth.token && to.redirectedFrom?.path === '/' && to.name !== auth.defaultDashboard) {
    return { name: auth.defaultDashboard };
  }

  // ✅ اگر کاربر لاگین کرده و به صفحه مهمان می‌رود
  if (to.meta.requiresGuest && auth.token) {
    return { name: auth.defaultDashboard };
  }

  // ✅ اگر نیاز به احراز هویت دارد و کاربر لاگین نکرده
  if (to.matched.some(record => record.meta.requiresAuth) && !auth.token) {
    return {
      name: 'login',
      query: { redirect: to.fullPath }
    };
  }

  // ✅ بررسی نقش خاص (roles)
  const requiredRoles = to.matched
      .map(record => record.meta.roles)
      .filter(Boolean)
      .flat();

  if (requiredRoles.length > 0 && !auth.hasAnyRole(requiredRoles)) {
    return { name: 'forbidden' };
  }

  // ✅ بررسی دسترسی (permission)
  const permissions = to.matched
      .map(record => record.meta.permission)
      .filter(Boolean);

  if (permissions.some(permission => !auth.can(permission))) {
    return { name: 'forbidden' };
  }

  return true;
});

export default router;
