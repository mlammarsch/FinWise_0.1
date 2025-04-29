// src/services/TenantService.ts
/**
 * TenantService – zentrale API für Mandanten-Management.
 */

import { useTenantStore } from '@/stores/tenantStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { CategoryService } from '@/services/CategoryService';
import { useSessionStore } from '@/stores/sessionStore';
import { infoLog, debugLog } from '@/utils/logger';
import { DataService } from './DataService'; // <-- NEU

export const TenantService = {
  /* ---------------------------------------------- Create Tenant */
  createTenant(tenantName: string) {
    const session = useSessionStore();
    if (!session.currentUserId) throw new Error('Kein eingeloggter User');

    const tenant = useTenantStore().addTenant(
      tenantName,
      session.currentUserId,
    );

    // Basis-Kategorie sicherstellen
    const catStore = useCategoryStore();
    if (!catStore.categories.find(c => c.name === 'Verfügbare Mittel')) {
      CategoryService.addCategory({
        name: 'Verfügbare Mittel',
        parentCategoryId: null,
        sortOrder: 0,
        isActive: true,
        isIncomeCategory: true,
        isSavingsGoal: false,
        categoryGroupId: null,
      });
    }
    infoLog('[TenantService]', 'Tenant angelegt', {
      tenantId: tenant.id,
      tenantName,
    });
    return tenant;
  },

  /* ---------------------------------------------- Rename Tenant */
  renameTenant(tenantId: string, newName: string): boolean {
    return useTenantStore().updateTenant(tenantId, newName);
  },

  /* ---------------------------------------------- Delete Tenant */
  deleteTenant(tenantId: string): boolean {
    return useTenantStore().deleteTenant(tenantId);
  },

  /* ---------------------------------------------- Switch Tenant */
  switchTenant(tenantId: string): boolean {
    const ok = useSessionStore().switchTenant(tenantId);
    if (ok) {
      DataService.reloadTenantData(); // <-- NEU
    }
    return ok;
  },

  /* ---------------------------------- List Tenants of current User */
  getOwnTenants() {
    const session = useSessionStore();
    if (!session.currentUserId) return [];
    return useTenantStore().getTenantsByUser(session.currentUserId);
  },

  /* ------------- Ensure tenant selected after login (helper) */
  ensureTenantSelected(): boolean {
    const session = useSessionStore();
    const ok = !!session.currentTenantId;
    if (!ok) debugLog('[TenantService] Kein Tenant aktiv – Auswahl erforderlich');
    return ok;
  },
};
