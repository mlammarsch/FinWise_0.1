<!-- Datei: src/components/budget/BudgetCategoryColumn.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { useCategoryStore } from "../../stores/categoryStore";

const categoryStore = useCategoryStore();
const expanded = defineModel<Set<string>>("expanded", { required: true });

const toggleExpand = (id: string) => {
  if (expanded.value.has(id)) expanded.value.delete(id);
  else expanded.value.add(id);
};

const rootCategories = categoryStore.categories.filter(
  (c) => !c.parentCategoryId
);
</script>

<template>
  <div class="bg-base-100 z-10" :style="$attrs.style">
    <!-- Leercard, entspricht der Höhe des Headers in BudgetMonthHeaderCard -->
    <div class="sticky top-0 bg-base-100 z-20">
      <!-- Kategoriename -->
      <div class="p-2 font-bold border-b border-base-300">Kategorie</div>
    </div>
    <div v-for="cat in rootCategories" :key="cat.id">
      <div class="p-2 border-b border-base-200">
        <button
          v-if="categoryStore.getChildCategories(cat.id).length > 0"
          class="btn btn-ghost btn-xs px-1 mr-1"
          @click="toggleExpand(cat.id)"
        >
          <span v-if="expanded.has(cat.id)">-</span><span v-else>+</span>
        </button>
        {{ cat.name }}
      </div>
      <template v-if="expanded.has(cat.id)">
        <div
          v-for="child in categoryStore.getChildCategories(cat.id)"
          :key="child.id"
          class="pl-6 text-sm p-2 border-b border-base-200"
        >
          {{ child.name }}
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
</style>
