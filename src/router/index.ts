import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

// Layouts
import DashboardView from '../views/DashboardView.vue'
import AccountsView from '../views/AccountsView.vue'
import TransactionsView from '../views/TransactionsView.vue'
import BudgetsView from '../views/BudgetsView.vue'
import StatisticsView from '../views/StatisticsView.vue'
import PlanningView from '../views/PlanningView.vue'
import SettingsView from '../views/SettingsView.vue'

// Admin Views
import AdminAccountsView from '../views/admin/AdminAccountsView.vue'
import AdminCategoriesView from '../views/admin/AdminCategoriesView.vue'
import AdminTagsView from '../views/admin/AdminTagsView.vue'
import AdminPlanningView from '../views/admin/AdminPlanningView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: 'Dashboard' }
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: AccountsView,
    meta: { title: 'Konten' }
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: TransactionsView,
    meta: { title: 'Transaktionen' }
  },
  {
    path: '/budgets',
    name: 'budgets',
    component: BudgetsView,
    meta: { title: 'Budgets' }
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: StatisticsView,
    meta: { title: 'Statistiken' }
  },
  {
    path: '/planning',
    name: 'planning',
    component: PlanningView,
    meta: { title: 'Planung' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: 'Einstellungen' }
  },
  {
    path: '/admin/accounts',
    name: 'admin-accounts',
    component: AdminAccountsView,
    meta: { title: 'Konten verwalten' }
  },
  {
    path: '/admin/categories',
    name: 'admin-categories',
    component: AdminCategoriesView,
    meta: { title: 'Kategorien verwalten' }
  },
  {
    path: '/admin/tags',
    name: 'admin-tags',
    component: AdminTagsView,
    meta: { title: 'Tags verwalten' }
  },
  {
    path: '/admin/planning',
    name: 'admin-planning',
    component: AdminPlanningView,
    meta: { title: 'Planungen verwalten' }
  },
  {
    path: '/account-group/:id/edit',
    name: 'edit-account-group',
    component: AccountsView,
    meta: { title: 'Konto Gruppe bearbeiten' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
