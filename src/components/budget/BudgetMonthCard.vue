<!-- Datei: src/components/budget/BudgetMonthCard.vue -->
<script setup lang="ts">
import { computed } from "vue";
import { useTransactionStore } from "../../stores/transactionStore";
import { Category } from "../../types";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";

const props = defineProps<{
  month: { start: Date; end: Date; label: string };
  categories: Category[];
  expanded: Set<string>;
}>();

const transactionStore = useTransactionStore();

/**
 * Berechnet für die gegebene Kategorie:
 * - budgeted: Platzhalter (0)
 * - spent: Summe der Buchungen im laufenden Monat
 * - saldo: Buchungen im Vormonat + Buchungen im laufenden Monat
 */
const computeData = (category: Category) => {
  const txsCurrent = transactionStore.transactions.filter(
    (tx) =>
      tx.categoryId === category.id &&
      new Date(tx.date) >= props.month.start &&
      new Date(tx.date) <= props.month.end
  );
  const spentCurrent = txsCurrent.reduce((sum, tx) => sum + tx.amount, 0);

  const prevMonthStart = new Date(
    props.month.start.getFullYear(),
    props.month.start.getMonth() - 1,
    1
  );
  const prevMonthEnd = new Date(
    props.month.start.getFullYear(),
    props.month.start.getMonth(),
    0
  );
  const txsPrev = transactionStore.transactions.filter(
    (tx) =>
      tx.categoryId === category.id &&
      new Date(tx.date) >= prevMonthStart &&
      new Date(tx.date) <= prevMonthEnd
  );
  const spentPrev = txsPrev.reduce((sum, tx) => sum + tx.amount, 0);

  return { budgeted: 0, spent: spentCurrent, saldo: spentPrev + spentCurrent };
};
</script>

<template>
  <div class="w-full border-l border-base-300">
    <!-- Tabellenheader -->
    <div class="sticky top-0 bg-base-100 z-20 p-2 border-b border-base-300">
      <div class="grid grid-cols-3">
        <div class="text-right font-bold">Budget</div>
        <div class="text-right font-bold">Transakt.</div>
        <div class="text-right font-bold">Saldo</div>
      </div>
    </div>
    <!-- Datenzeilen -->
    <div class="grid grid-rows-auto">
      <template v-for="cat in categories" :key="cat.id">
        <div class="grid grid-cols-3 p-2 border-b border-base-200">
          <div class="text-right">
            <CurrencyDisplay :amount="computeData(cat).budgeted" />
          </div>
          <div class="text-right">
            <CurrencyDisplay :amount="computeData(cat).spent" />
          </div>
          <div class="text-right">
            <CurrencyDisplay :amount="computeData(cat).saldo" />
          </div>
        </div>
        <template v-if="props.expanded.has(cat.id)">
          <div
            v-for="child in cat.children"
            :key="child.id"
            class="grid grid-cols-3 pl-6 text-sm p-2 border-b border-base-200"
          >
            <div class="text-right">
              <CurrencyDisplay :amount="computeData(child).budgeted" />
            </div>
            <div class="text-right">
              <CurrencyDisplay :amount="computeData(child).spent" />
            </div>
            <div class="text-right">
              <CurrencyDisplay :amount="computeData(child).saldo" />
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
</style>
