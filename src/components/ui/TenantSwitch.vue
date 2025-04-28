<!-- src/components/ui/TenantSwitch.vue -->
<script setup lang="ts">
/**
 * Pfad: src/components/ui/TenantSwitch.vue
 * Kleine Select-Box im Header zum schnellen Tenant-Wechsel.
 *
 * Props:
 * - Keine
 *
 * Emits:
 * - Keine (intern via TenantService)
 */

import { ref, computed } from "vue";
import { Icon } from "@iconify/vue";
import { TenantService } from "@/services/TenantService";
import { useSessionStore } from "@/stores/sessionStore";

const dropdown = ref(false);
const session = useSessionStore();

const tenants = computed(() => TenantService.getOwnTenants());

function toggle() {
  dropdown.value = !dropdown.value;
}

function switchTenant(id: string) {
  TenantService.switchTenant(id);
  dropdown.value = false;
}
</script>

<template>
  <div class="relative">
    <button class="btn btn-ghost" @click="toggle">
      <Icon icon="mdi:office-building" class="mr-2" />
      <span>{{ session.currentTenant?.tenantName || "Mandant wählen" }}</span>
      <Icon icon="mdi:chevron-down" />
    </button>

    <ul
      v-if="dropdown"
      class="absolute z-40 mt-1 p-2 menu bg-base-100 border border-base-300 rounded-box w-56 shadow-lg"
    >
      <li
        v-for="t in tenants"
        :key="t.id"
        @click="switchTenant(t.id)"
        class="rounded-box"
      >
        <a :class="{ active: t.id === session.currentTenantId }">
          {{ t.tenantName }}
        </a>
      </li>
    </ul>
  </div>
</template>
