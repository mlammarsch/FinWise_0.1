// src/services/SessionService.ts
/**
 * SessionService – stellt Router-Guards & Initial-Bootstrapping bereit.
 */

import { Router } from 'vue-router';
import { useSessionStore } from '@/stores/sessionStore';
import { TenantService } from './TenantService';
import { infoLog, debugLog } from '@/utils/logger';

export const SessionService = {
  /**
   * Legt alle globalen Guards an.
   */
  setupGuards(router: Router) {
    router.beforeEach(async (to, _from, next) => {
      const session = useSessionStore();

      // Lade Session aus LocalStorage beim ersten Guard-Aufruf
      if (!session.currentUserId) session.loadSession();

      const isAuthRoute = ['/login', '/register'].includes(to.path);
      const isTenantRoute = to.path === '/tenant-select';

      /* ---------- Kein User eingeloggt ---------- */
      if (!session.currentUserId) {
        if (isAuthRoute) return next();
        return next({ path: '/login' });
      }

      /* ---------- User eingeloggt, aber Tenant fehlt ---------- */
      if (!session.currentTenantId) {
        // Versuche automatisch einen Tenant zu setzen
        const ok = TenantService.ensureTenantSelected();
        if (!ok) {
          if (!isTenantRoute) return next({ path: '/tenant-select' });
        }
      }

      /* ---------- Auth + Tenant OK ---------- */
      if (isAuthRoute || isTenantRoute) {
        // Schon eingeloggt → zum Dashboard
        return next({ path: '/' });
      }

      return next();
    });

    // Logging erst NACH vollständigem Setup
    // Sicherer Weg (wenn infoLog benötigt wird)
    setTimeout(() => {
      infoLog('[SessionService]', 'Router-Guards aktiviert');
    }, 0);
  },

  /**
   * Convenience: Ausloggen + Redirect.
   */
  logoutAndRedirect(router: Router) {
    useSessionStore().logout();
    router.push('/login');
  },
};
