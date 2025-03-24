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
import AdminRecipientsView from '../views/admin/AdminRecipientsView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: 'Dashboard', breadcrumb: 'Dashboard' }
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: AccountsView,
    meta: { title: 'Konten', breadcrumb: 'Konten' }
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: TransactionsView,
    meta: { title: 'Transaktionen', breadcrumb: 'Transaktionen' }
  },
  {
    path: '/budgets',
    name: 'budgets',
    component: BudgetsView,
    meta: { title: 'Budgets', breadcrumb: 'Budgets' }
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: StatisticsView,
    meta: { title: 'Statistiken', breadcrumb: 'Statistiken' }
  },
  {
    path: '/planning',
    name: 'planning',
    component: PlanningView,
    meta: { title: 'Planung', breadcrumb: 'Planung' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: 'Einstellungen', breadcrumb: 'Einstellungen' }
  },
  {
    path: '/admin/accounts',
    name: 'admin-accounts',
    component: AdminAccountsView,
    meta: { title: 'Konten verwalten', breadcrumb: 'Konten verwalten' }
  },
  {
    path: '/admin/categories',
    name: 'admin-categories',
    component: AdminCategoriesView,
    meta: { title: 'Kategorien verwalten', breadcrumb: 'Kategorien verwalten' }
  },
  {
    path: '/admin/tags',
    name: 'admin-tags',
    component: AdminTagsView,
    meta: { title: 'Tags verwalten', breadcrumb: 'Tags verwalten' }
  },
  {
    path: '/admin/planning',
    name: 'admin-planning',
    component: AdminPlanningView,
    meta: { title: 'Planungen verwalten', breadcrumb: 'Planungen verwalten' }
  },
  {
    path: '/admin/recipients',
    name: 'admin-recipients',
    component: AdminRecipientsView,
    meta: { title: 'Empfänger verwalten', breadcrumb: 'Empfänger verwalten' }
  },
  {
    path: '/accounts/:id/edit', // Route für Konto bearbeiten
    name: 'edit-account',
    component: AccountsView, // Oder eine dedizierte AccountEditView, falls benötigt
    meta: { title: 'Konto bearbeiten', breadcrumb: 'Konto bearbeiten' },
    props: true // Ermöglicht das Übergeben von route params als props
  },
  {
    path: '/account-group/:id/edit',
    name: 'edit-account-group',
    component: AccountsView,
    meta: { title: 'Konto Gruppe bearbeiten', breadcrumb: 'Konto Gruppe bearbeiten' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
});


export default router
