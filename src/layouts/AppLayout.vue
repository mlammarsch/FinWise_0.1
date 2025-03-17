<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useThemeStore } from "../stores/themeStore";
import MainNavigation from "../components/ui/MainNavigation.vue";
import ThemeToggle from "../components/ui/ThemeToggle.vue";
import { Icon } from "@iconify/vue";

const router = useRouter();
const themeStore = useThemeStore();
const isMobileMenuOpen = ref(false);

/**
 * Pfad zur Komponente: src/layouts/AppLayout.vue
 *
 * Diese Layout-Komponente stellt die Grundstruktur der Anwendung dar,
 * inklusive Header mit Navigation, Hauptinhalt und Footer.
 *
 * Komponenten-Props:
 * - Keine Props vorhanden.
 *
 * Emits:
 * - Keine Emits vorhanden.
 */

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};
</script>

<template>
  <div class="min-h-screen bg-gradient relative">
    <!-- <div class="min-h-screen bg-base-100 relative"> -->
    <!-- Blur-Effekt für Hintergrund -->
    <div class="absolute bg-base-100/95 inset-0 backdrop-blur-md"></div>

    <!-- Header -->
    <header class="glass-effect sticky top-0 border-b border-base-300 z-10">
      <div class="navbar container mx-auto">
        <div class="navbar-start">
          <!-- Mobile Menü Button -->
          <div class="dropdown">
            <button class="btn btn-ghost lg:hidden" @click="toggleMobileMenu">
              <Icon icon="mdi:menu" class="h-5 w-5" />
            </button>
            <ul
              v-if="isMobileMenuOpen"
              class="menu menu-sm dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
            >
              <MainNavigation @close-menu="isMobileMenuOpen = false" />
            </ul>
          </div>
          <!-- Logo "FinWise"-->
          <div class="flex normal-case text-2xl p-3">
            <div
              class="text-primary font-normal"
              style="font-family: 'Lobster', cursive"
            >
              Fin
            </div>
            <div
              class="text-secondary font-normal"
              style="font-family: 'Lobster Two', cursive"
            >
              Wise
            </div>
          </div>
        </div>

        <!-- Hauptnavigation für größere Bildschirme -->
        <div class="navbar-center hidden lg:flex p-2">
          <ul class="menu menu-md menu-horizontal">
            <MainNavigation />
          </ul>
        </div>

        <!-- Theme-Umschalter -->
        <div class="navbar-end p-3">
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Hauptinhalt -->
    <main class="container mx-auto px-4 py-6 relative">
      <slot></slot>
    </main>

    <!-- Footer -->
    <footer
      class="footer footer-center p-4 glass-effect text-base-content border-t border-base-300 relative"
    >
      <div>
        <p>
          © {{ new Date().getFullYear() }} - FinWise - Dein smarter
          Finanzassistent
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped></style>
