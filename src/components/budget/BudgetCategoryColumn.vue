<!-- Datei: src/components/budget/BudgetCategoryColumn.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/BudgetCategoryColumn.vue
 * Zeigt links die Kategorien an, unterteilt in Ausgaben und Einnahmen.
 * Komponenten-Props:
 * - expanded: Set<string> - Enthält IDs aufgeklappter Kategorien
 *
 * Emits:
 * - Keine Emits
 */
import { ref } from "vue";
import { useCategoryStore } from "../../stores/categoryStore";
import { debugLog } from "@/utils/logger";

const categoryStore = useCategoryStore();
const expanded = defineModel<Set<string>>("expanded", { required: true });

const toggleExpand = (id: string) => {
  if (expanded.value.has(id)) {
    expanded.value.delete(id);
    debugLog("[BudgetCategoryColumn] toggleExpand - Collapsed category:", id);
  } else {
    expanded.value.add(id);
    debugLog("[BudgetCategoryColumn] toggleExpand - Expanded category:", id);
  }
};

const isVerfuegbareMittel = (cat: { name: string }) =>
  cat.name.trim().toLowerCase() === "verfügbare mittel";

const rootCategories = categoryStore.categories.filter(
  (c) => c.isActive && !c.parentCategoryId && !isVerfuegbareMittel(c)
);
</script>

<template>
  <div class="bg-base-100 p-1 rounded-lg z-10" :style="$attrs.style">
    <!-- Header-Ersatz: Leerzeile, da wir im BudgetMonthHeaderCard den Spaltenkopf haben -->
    <div class="sticky top-0 bg-base-100 z-20">
      <div class="p-2 font-bold border-b border-base-300">Kategorie</div>
    </div>

    <!-- Ausgaben -->
    <div class="p-2 font-bold border-b border-base-300 mt-2">Ausgaben</div>
    <div
      v-for="cat in rootCategories.filter((c) => !c.isIncomeCategory)"
      :key="cat.id"
    >
      <div class="p-2 border-b border-base-200">
        <button
          v-if="
            categoryStore
              .getChildCategories(cat.id)
              .filter((c) => c.isActive && !isVerfuegbareMittel(c)).length > 0
          "
          class="btn btn-ghost btn-xs px-1 mr-1"
          @click="toggleExpand(cat.id)"
        >
          <span v-if="expanded.has(cat.id)">-</span><span v-else>+</span>
        </button>
        {{ cat.name }}
      </div>
      <template v-if="expanded.has(cat.id)">
        <div
          v-for="child in categoryStore
            .getChildCategories(cat.id)
            .filter((c) => c.isActive && !isVerfuegbareMittel(c))"
          :key="child.id"
          class="pl-6 text-sm p-2 border-b border-base-200"
        >
          {{ child.name }}
        </div>
      </template>
    </div>

    <!-- Einnahmen -->
    <div class="p-2 font-bold border-b border-base-300 mt-4">Einnahmen</div>
    <div
      v-for="cat in rootCategories.filter((c) => c.isIncomeCategory)"
      :key="cat.id"
    >
      <div class="p-2 border-b border-base-200">
        <button
          v-if="
            categoryStore
              .getChildCategories(cat.id)
              .filter((c) => c.isActive && !isVerfuegbareMittel(c)).length > 0
          "
          class="btn btn-ghost btn-xs px-1 mr-1"
          @click="toggleExpand(cat.id)"
        >
          <span v-if="expanded.has(cat.id)">-</span><span v-else>+</span>
        </button>
        {{ cat.name }}
      </div>
      <template v-if="expanded.has(cat.id)">
        <div
          v-for="child in categoryStore
            .getChildCategories(cat.id)
            .filter((c) => c.isActive && !isVerfuegbareMittel(c))"
          :key="child.id"
          class="pl-6 text-sm p-2 border-b border-base-200"
        >
          {{ child.name }}
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped></style>
