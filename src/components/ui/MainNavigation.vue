<script setup lang="ts">
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { seedData, clearData } from "../../mock/seed";

import { useAccountStore } from "../../stores/accountStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { useTagStore } from "../../stores/tagStore";
import { useTransactionStore } from "../../stores/transactionStore";
import { usePlanningStore } from "../../stores/planningStore";
import { useStatisticsStore } from "../../stores/statisticsStore";
import { useThemeStore } from "../../stores/themeStore";

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
  { path: "/admin/recipients", name: "Empfänger", icon: "mdi:person-edit" },
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

const clearAndReseedData = () => {
  if (confirm("Möchten Sie wirklich alle Daten löschen und neu laden?")) {
    const stores = [
      useAccountStore(),
      useCategoryStore(),
      useRecipientStore(),
      useTagStore(),
      useTransactionStore(),
      usePlanningStore(),
      useStatisticsStore(),
      useThemeStore(),
    ];

    stores.forEach((store) => {
      if (typeof store.reset === "function") store.reset();
    });

    clearData();
    seedData();
    router.push("/");
  }
};
</script>

<template>
  <template
    v-for="route in routes"
    :key="route.path"
  >
    <li @click="$emit('closeMenu')">
      <router-link
        :to="route.path"
        :class="{
          active: isActive(route.path),
          'text-primary bg-primary/20': isActive(route.path),
        }"
        class="rounded-box"
      >
        <span class="flex items-center">
          <Icon
            class="mr-2"
            :icon="route.icon"
          />
          {{ route.name }}
        </span>
      </router-link>
    </li>
  </template>

  <li class="dropdown dropdown-hover">
    <details>
      <summary class="rounded-box">
        <span class="flex items-center">
          <Icon
            class="mr-2"
            icon="mdi:tools"
          />
          Administration
        </span>
      </summary>
      <ul class="p-2 bg-base-100">
        <template
          v-for="route in adminRoutes"
          :key="route.path"
        >
          <li @click="$emit('closeMenu')">
            <router-link
              :to="route.path"
              :class="{
                active: isActive(route.path),
                'text-primary bg-primary/20': isActive(route.path),
              }"
              class="rounded-box"
            >
              <span class="flex items-center">
                <Icon
                  class="mr-2"
                  :icon="route.icon"
                />
                {{ route.name }}
              </span>
            </router-link>
          </li>
        </template>
        <li>
          <button
            class="rounded-box"
            @click="clearAndReseedData"
          >
            <span class="flex items-center">
              <Icon
                class="mr-2"
                icon="mdi:database-refresh"
              />
              Daten löschen & neu laden
            </span>
          </button>
        </li>
      </ul>
    </details>
  </li>
</template>
