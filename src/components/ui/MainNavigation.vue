<!-- MainNavigation.vue -->
<script setup lang="ts">
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";

defineEmits(["closeMenu"]);

const router = useRouter();

/**
 * Navigation für die Haupt- und Administrationsbereiche.
 *
 * Komponenten-Props:
 * - Keine Props vorhanden.
 *
 * Emits:
 * - closeMenu: Wird ausgelöst, wenn ein Menüpunkt geklickt wird, um das Menü zu schließen.
 */

const routes = [
  { path: "/", name: "Dashboard", icon: "mdi:view-dashboard" },
  { path: "/accounts", name: "Konten", icon: "mdi:bank" },
  { path: "/transactions", name: "Transaktionen", icon: "mdi:swap-horizontal" },
  { path: "/budgets", name: "Budgets", icon: "mdi:wallet" },
  { path: "/statistics", name: "Statistiken", icon: "mdi:chart-bar" },
  { path: "/planning", name: "Planung", icon: "mdi:calendar" },
];

const adminRoutes = [
  { path: "/admin/accounts", name: "Konten verwalten", icon: "mdi:bank-edit" },
  {
    path: "/admin/categories",
    name: "Kategorien verwalten",
    icon: "mdi:tag-multiple",
  },
  { path: "/admin/tags", name: "Tags verwalten", icon: "mdi:label" },
  {
    path: "/admin/planning",
    name: "Planungen verwalten",
    icon: "mdi:calendar-edit",
  },
  { path: "/settings", name: "Einstellungen", icon: "mdi:cog" },
];

const isActive = (path: string) => {
  return router.currentRoute.value.path === path;
};
</script>

<template>
  <template v-for="route in routes" :key="route.path">
    <li @click="$emit('closeMenu')">
      <router-link :to="route.path" :class="{ active: isActive(route.path) }">
        <span class="flex items-center">
          <Icon class="mr-2" :icon="route.icon" />
          {{ route.name }}
        </span>
      </router-link>
    </li>
  </template>

  <li>
    <details>
      <summary>
        <span class="flex items-center">
          <Icon class="mr-2" icon="mdi:tools" />
          Administration
        </span>
      </summary>
      <ul class="p-2 bg-base-100">
        <template v-for="route in adminRoutes" :key="route.path">
          <li @click="$emit('closeMenu')">
            <router-link
              :to="route.path"
              :class="{ active: isActive(route.path) }"
            >
              <span class="flex items-center">
                <!-- <span class="iconify mr-2" :data-icon="route.icon"></span> -->
                <Icon class="mr-2" :icon="route.icon" />
                {{ route.name }}
              </span>
            </router-link>
          </li>
        </template>
      </ul>
    </details>
  </li>
</template>
