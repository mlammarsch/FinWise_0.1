<!-- Datei: src/views/BudgetsView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useCategoryStore } from "../stores/categoryStore";
import BudgetCategoryColumn from "../components/budget/BudgetCategoryColumn.vue";
import BudgetMonthCard from "../components/budget/BudgetMonthCard.vue";
import BudgetMonthHeaderCard from "../components/budget/BudgetMonthHeaderCard.vue";

const categoryStore = useCategoryStore();

const localStorageKey = "finwise_budget_months";
const numMonths = ref<number>(3);
const monthOffset = ref<number>(0);

onMounted(() => {
  const stored = localStorage.getItem(localStorageKey);
  if (stored) numMonths.value = parseInt(stored);
});
watch(numMonths, (newVal) => {
  localStorage.setItem(localStorageKey, newVal.toString());
});

const months = computed(() => {
  const result = [];
  const base = new Date();
  const baseMonth = new Date(
    base.getFullYear(),
    base.getMonth() + 1 + monthOffset.value,
    0
  );
  for (let i = numMonths.value - 1; i >= 0; i--) {
    const d = new Date(baseMonth.getFullYear(), baseMonth.getMonth() - i, 0);
    result.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleString("de-DE", { month: "long", year: "numeric" }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: d,
    });
  }
  return result;
});

const expanded = ref<Set<string>>(new Set());

const categories = computed(() => {
  return categoryStore.categories.filter((cat) => !cat.parentCategoryId);
});

const totalColumns = computed(() => months.value.length + 1);
</script>

<template>
  <!-- Wrapper mit fester Höhe; hier wird angenommen, dass Header+Footer 160px einnehmen -->
  <div class="h-[calc(100vh-190px)] overflow-hidden">
    <div class="flex flex-col h-full min-h-0">
      <!-- Header-Bereich (sticky) -->
      <div class="sticky top-0 z-20 bg-base-100">
        <div class="p-4 flex flex-col">
          <!-- Zeile 1: Navigation + Headerbereich -->
          <div class="mb-4 shrink-0">
            <div class="flex items-center justify-between mb-4">
              <h1 class="text-2xl font-bold">Budgetübersicht</h1>
              <div class="flex items-center gap-2">
                <button class="btn btn-sm" @click="monthOffset--">
                  &laquo;
                </button>
                <button class="btn btn-sm" @click="monthOffset++">
                  &raquo;
                </button>
                <select
                  v-model.number="numMonths"
                  class="select select-bordered select-sm w-20"
                >
                  <option v-for="n in 6" :key="n" :value="n">
                    {{ n }} Monate
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div class="h-full flex overflow-x-auto">
          <div
            :style="{ flex: '0 0 calc(100% / ' + totalColumns + ')' }"
            class="flex flex-col overflow-hidden"
          ></div>
          <div
            v-for="month in months"
            :key="month.key"
            :style="{ flex: '0 0 calc(100% / ' + totalColumns + ')' }"
            class="flex flex-col overflow-hidden"
          >
            <BudgetMonthHeaderCard
              :label="month.label"
              :toBudget="200"
              :budgeted="0"
              :overspent="0"
              :available="200"
              :nextMonth="0"
            />
          </div>
        </div>
      </div>

      <!-- Datenbereich (scrollbar) -->
      <div class="grow min-h-0 overflow-y-auto">
        <div class="h-full flex overflow-x-auto">
          <!-- Kategorie-Spalte -->
          <div
            :style="{ flex: '0 0 calc(100% / ' + totalColumns + ')' }"
            class="flex flex-col overflow-hidden"
          >
            <BudgetCategoryColumn
              v-model:expanded="expanded"
              class="h-full overflow-y-auto"
            />
          </div>

          <!-- Monats-Spalten -->
          <div
            v-for="month in months"
            :key="month.key"
            :style="{ flex: '0 0 calc(100% / ' + totalColumns + ')' }"
            class="flex flex-col overflow-hidden"
          >
            <div class="overflow-y-auto h-full">
              <BudgetMonthCard
                :month="month"
                :categories="categories"
                :expanded="expanded"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
