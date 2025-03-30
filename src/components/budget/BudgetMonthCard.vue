<!-- Datei: src/components/budget/BudgetMonthCard.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/BudgetMonthCard.vue
 * Zeigt pro Monat die Budget-, Transaktions- und Saldo-Werte an.
 *
 * Für Ausgabenkategorien:
 * - Mittlere Spalte ("Transakt.") basiert auf echten Buchungen:
 *   EXPENSE, INCOME und ACCOUNTTRANSFER (CATEGORYTRANSFER werden ausgeschlossen).
 * - Letzte Spalte ("Saldo") bildet den tatsächlichen Endsaldo ab,
 *   indem der Vormonatssaldo plus alle Buchungen des laufenden Monats (inkl. CATEGORYTRANSFER)
 *   berücksichtigt wird.
 *
 * Die Stammkategorie "Verfügbare Mittel" wird in der Ansicht komplett ausgefiltert.
 *
 * Komponenten-Props:
 * - month: { start: Date; end: Date; label: string } – Der aktuelle Anzeigemonat
 * - categories: Category[] – Liste aller Kategorien
 * - expanded: Set<string> – IDs der aufgeklappten Kategorien
 *
 * Emits:
 * - Keine Emits
 */
import { computed } from "vue";
import { useTransactionStore } from "../../stores/transactionStore";
import { Category, TransactionType } from "../../types";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { debugLog } from "@/utils/logger";
import {
  calculateCategorySaldo,
  calculateIncomeCategorySaldo,
} from "@/utils/runningBalances";
import { toDateOnlyString } from "@/utils/formatters";

const props = defineProps<{
  month: { start: Date; end: Date; label: string };
  categories: Category[];
  expanded: Set<string>;
}>();

const transactionStore = useTransactionStore();

// Normierung der Monatsdaten
const normalizedMonthStart = new Date(toDateOnlyString(props.month.start));
const normalizedMonthEnd = new Date(toDateOnlyString(props.month.end));

// Filter: Nur echte Konto-Buchungen (ohne CATEGORYTRANSFER) für die Transaktions-Spalte.
const filteredTxs = computed(() =>
  transactionStore.transactions.filter(
    (tx) =>
      tx.type === TransactionType.EXPENSE ||
      tx.type === TransactionType.INCOME ||
      tx.type === TransactionType.ACCOUNTTRANSFER
  )
);

// Hilfsfunktion, um die Stammkategorie "Verfügbare Mittel" zu identifizieren.
const isVerfuegbareMittel = (cat: Category) =>
  cat.name.trim().toLowerCase() === "verfügbare mittel";

// Zusammenfassung für Ausgabenkategorien: Mittlere Spalte (ohne Transfers) und
// tatsächlicher Endsaldo (inkl. Transfers)
const sumExpensesSummary = computed(() => {
  let budgeted = 0;
  let spentMiddle = 0; // Transaktionen ohne CATEGORYTRANSFER
  let saldoFull = 0; // Endsaldo inkl. CATEGORYTRANSFER
  const txsMiddle = filteredTxs.value;
  const txsFull = transactionStore.transactions;
  for (const cat of props.categories.filter(
    (c) =>
      c.isActive &&
      !c.isIncomeCategory &&
      !c.parentCategoryId &&
      !isVerfuegbareMittel(c)
  )) {
    const dataMiddle = calculateCategorySaldo(
      txsMiddle,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    const dataFull = calculateCategorySaldo(
      txsFull,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    budgeted += dataMiddle.budgeted;
    spentMiddle += dataMiddle.spent;
    saldoFull += dataFull.saldo;
    for (const child of cat.children || []) {
      if (child.isActive && !isVerfuegbareMittel(child)) {
        const childDataMiddle = calculateCategorySaldo(
          txsMiddle,
          child.id,
          normalizedMonthStart,
          normalizedMonthEnd
        );
        const childDataFull = calculateCategorySaldo(
          txsFull,
          child.id,
          normalizedMonthStart,
          normalizedMonthEnd
        );
        budgeted += childDataMiddle.budgeted;
        spentMiddle += childDataMiddle.spent;
        saldoFull += childDataFull.saldo;
      }
    }
  }
  return { budgeted, spentMiddle, saldoFull };
});

// Zusammenfassung für Einnahmekategorien: Analog, wobei hier CATEGORYTRANSFER
// standardmäßig einbezogen wird.
const sumIncomesSummary = computed(() => {
  let budgeted = 0;
  let spentMiddle = 0;
  let saldoFull = 0;
  const txsMiddle = filteredTxs.value;
  const txsFull = transactionStore.transactions;
  for (const cat of props.categories.filter(
    (c) =>
      c.isActive &&
      c.isIncomeCategory &&
      !c.parentCategoryId &&
      !isVerfuegbareMittel(c)
  )) {
    const dataMiddle = calculateIncomeCategorySaldo(
      txsMiddle,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    const dataFull = calculateIncomeCategorySaldo(
      txsFull,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    budgeted += dataMiddle.budgeted;
    spentMiddle += dataMiddle.spent;
    saldoFull += dataFull.saldo;
    for (const child of cat.children || []) {
      if (child.isActive && !isVerfuegbareMittel(child)) {
        const childDataMiddle = calculateIncomeCategorySaldo(
          txsMiddle,
          child.id,
          normalizedMonthStart,
          normalizedMonthEnd
        );
        const childDataFull = calculateIncomeCategorySaldo(
          txsFull,
          child.id,
          normalizedMonthStart,
          normalizedMonthEnd
        );
        budgeted += childDataMiddle.budgeted;
        spentMiddle += childDataMiddle.spent;
        saldoFull += childDataFull.saldo;
      }
    }
  }
  return { budgeted, spentMiddle, saldoFull };
});
</script>

<template>
  <div class="w-full p-1 rounded-lg">
    <!-- Tabellenheader -->
    <div class="sticky top-0 bg-base-100 z-20 p-2 border-b border-base-300">
      <div class="grid grid-cols-3">
        <div class="text-right font-bold">Budget</div>
        <div class="text-right font-bold">Transakt.</div>
        <div class="text-right font-bold">Saldo</div>
      </div>
    </div>

    <!-- Überschrift Ausgaben -->
    <div class="p-2 font-bold border-b border-base-300 mt-2">
      <!-- Summenzeile Ausgaben -->
      <div class="grid grid-cols-3 font-bold">
        <div class="text-right">
          <CurrencyDisplay
            :amount="sumExpensesSummary.budgeted"
            :asInteger="true"
          />
        </div>
        <div class="text-right">
          <CurrencyDisplay
            :amount="sumExpensesSummary.spentMiddle"
            :asInteger="true"
          />
        </div>
        <div class="text-right">
          <CurrencyDisplay
            :amount="sumExpensesSummary.saldoFull"
            :asInteger="true"
          />
        </div>
      </div>
    </div>
    <div class="grid grid-rows-auto">
      <template
        v-for="cat in props.categories.filter(
          (c) =>
            c.isActive &&
            !c.isIncomeCategory &&
            !c.parentCategoryId &&
            !isVerfuegbareMittel(c)
        )"
        :key="cat.id"
      >
        <div class="grid grid-cols-3 p-2 border-b border-base-200">
          <div class="text-right">
            <CurrencyDisplay
              :amount="
                calculateCategorySaldo(
                  filteredTxs,
                  cat.id,
                  normalizedMonthStart,
                  normalizedMonthEnd
                ).budgeted
              "
              :asInteger="true"
            />
          </div>
          <div class="text-right">
            <!-- Transaktionen ohne CATEGORYTRANSFER -->
            <CurrencyDisplay
              :amount="
                calculateCategorySaldo(
                  filteredTxs,
                  cat.id,
                  normalizedMonthStart,
                  normalizedMonthEnd
                ).spent
              "
              :asInteger="true"
            />
          </div>
          <div class="text-right">
            <!-- Tatsächlicher Saldo inkl. CATEGORYTRANSFER -->
            <CurrencyDisplay
              :amount="
                calculateCategorySaldo(
                  transactionStore.transactions,
                  cat.id,
                  normalizedMonthStart,
                  normalizedMonthEnd
                ).saldo
              "
              :asInteger="true"
            />
          </div>
        </div>
        <template v-if="props.expanded.has(cat.id)">
          <div
            v-for="child in cat.children.filter(
              (c) => c.isActive && !isVerfuegbareMittel(c)
            )"
            :key="child.id"
            class="grid grid-cols-3 pl-6 text-sm p-2 border-b border-base-200"
          >
            <div class="text-right">
              <CurrencyDisplay
                :amount="
                  calculateCategorySaldo(
                    filteredTxs,
                    child.id,
                    normalizedMonthStart,
                    normalizedMonthEnd
                  ).budgeted
                "
                :asInteger="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="
                  calculateCategorySaldo(
                    filteredTxs,
                    child.id,
                    normalizedMonthStart,
                    normalizedMonthEnd
                  ).spent
                "
                :asInteger="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="
                  calculateCategorySaldo(
                    transactionStore.transactions,
                    child.id,
                    normalizedMonthStart,
                    normalizedMonthEnd
                  ).saldo
                "
                :asInteger="true"
              />
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Überschrift Einnahmen -->
    <div class="p-2 font-bold border-b border-base-300 mt-4">
      <!-- Summenzeile Einnahmen -->
      <div class="grid grid-cols-3 font-bold">
        <div class="text-right">
          <CurrencyDisplay
            :amount="sumIncomesSummary.budgeted"
            :asInteger="true"
          />
        </div>
        <div class="text-right">
          <CurrencyDisplay
            :amount="sumIncomesSummary.spentMiddle"
            :asInteger="true"
          />
        </div>
        <div class="text-right">
          <CurrencyDisplay
            :amount="sumIncomesSummary.saldoFull"
            :asInteger="true"
          />
        </div>
      </div>
    </div>
    <div class="grid grid-rows-auto">
      <template
        v-for="cat in props.categories.filter(
          (c) =>
            c.isActive &&
            c.isIncomeCategory &&
            !c.parentCategoryId &&
            !isVerfuegbareMittel(c)
        )"
        :key="cat.id"
      >
        <div class="grid grid-cols-3 p-2 border-b border-base-200">
          <div class="text-right">
            <CurrencyDisplay
              :amount="
                calculateIncomeCategorySaldo(
                  filteredTxs,
                  cat.id,
                  normalizedMonthStart,
                  normalizedMonthEnd
                ).budgeted
              "
              :asInteger="true"
            />
          </div>
          <div class="text-right">
            <CurrencyDisplay
              :amount="
                calculateIncomeCategorySaldo(
                  filteredTxs,
                  cat.id,
                  normalizedMonthStart,
                  normalizedMonthEnd
                ).spent
              "
              :asInteger="true"
            />
          </div>
          <div class="text-right">
            <CurrencyDisplay
              :amount="
                calculateIncomeCategorySaldo(
                  transactionStore.transactions,
                  cat.id,
                  normalizedMonthStart,
                  normalizedMonthEnd
                ).saldo
              "
              :asInteger="true"
            />
          </div>
        </div>
        <template v-if="props.expanded.has(cat.id)">
          <div
            v-for="child in cat.children.filter(
              (c) => c.isActive && !isVerfuegbareMittel(c)
            )"
            :key="child.id"
            class="grid grid-cols-3 pl-6 text-sm p-2 border-b border-base-200"
          >
            <div class="text-right">
              <CurrencyDisplay
                :amount="
                  calculateIncomeCategorySaldo(
                    filteredTxs,
                    child.id,
                    normalizedMonthStart,
                    normalizedMonthEnd
                  ).budgeted
                "
                :asInteger="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="
                  calculateIncomeCategorySaldo(
                    filteredTxs,
                    child.id,
                    normalizedMonthStart,
                    normalizedMonthEnd
                  ).spent
                "
                :asInteger="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="
                  calculateIncomeCategorySaldo(
                    transactionStore.transactions,
                    child.id,
                    normalizedMonthStart,
                    normalizedMonthEnd
                  ).saldo
                "
                :asInteger="true"
              />
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped></style>
