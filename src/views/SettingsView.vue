<!-- Datei: src/views/SettingsView.vue -->
<script setup lang="ts">
import { ref, computed } from "vue";
import { useThemeStore } from "../stores/themeStore";
import { useAccountStore } from "../stores/accountStore";
import { useCategoryStore } from "../stores/categoryStore";
import { useTransactionStore } from "../stores/transactionStore";
import { useTransactionFilterStore } from "../stores/transactionFilterStore";
import { usePlanningStore } from "../stores/planningStore";
import { useTagStore } from "../stores/tagStore";
import { isDebugEnabled } from "../utils/logger";

// Stores
const themeStore = useThemeStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();
const planningStore = usePlanningStore();
const tagStore = useTagStore();

// Statistiken
const stats = computed(() => {
  return {
    accounts: accountStore.accounts.length,
    accountGroups: accountStore.accountGroups.length,
    categories: categoryStore.categories.length,
    categoryGroups: categoryStore.categoryGroups.length,
    transactions: transactionStore.transactions.length,
    planningTransactions: planningStore.planningTransactions.length,
    tags: tagStore.tags.length,
  };
});

// Debug Logging Setting
const debugFlag = ref<boolean>(
  localStorage.getItem("finwise_debug_logging") === "true"
);

const toggleDebug = () => {
  debugFlag.value = !debugFlag.value;
  isDebugEnabled.value = debugFlag.value;
  localStorage.setItem("finwise_debug_logging", debugFlag.value.toString());
};

// Daten exportieren
const exportData = () => {
  const data = {
    accounts: accountStore.accounts,
    accountGroups: accountStore.accountGroups,
    categories: categoryStore.categories,
    categoryGroups: categoryStore.categoryGroups,
    transactions: transactionStore.transactions,
    planningTransactions: planningStore.planningTransactions,
    tags: tagStore.tags,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `finwise-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Daten importieren
const importData = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);

      // Prüfe, ob die Daten gültig sind
      if (
        !data.accounts ||
        !data.accountGroups ||
        !data.categories ||
        !data.categoryGroups ||
        !data.transactions ||
        !data.planningTransactions ||
        !data.tags
      ) {
        throw new Error("Ungültiges Dateiformat");
      }

      // Bestätige den Import
      if (
        confirm(
          "Möchten Sie wirklich alle Daten importieren? Bestehende Daten werden überschrieben."
        )
      ) {
        // Speichere die Daten im localStorage
        localStorage.setItem("finwise_accounts", JSON.stringify(data.accounts));
        localStorage.setItem(
          "finwise_account_groups",
          JSON.stringify(data.accountGroups)
        );
        localStorage.setItem(
          "finwise_categories",
          JSON.stringify(data.categories)
        );
        localStorage.setItem(
          "finwise_category_groups",
          JSON.stringify(data.categoryGroups)
        );
        localStorage.setItem(
          "finwise_transactions",
          JSON.stringify(data.transactions)
        );
        localStorage.setItem(
          "finwise_planning_transactions",
          JSON.stringify(data.planningTransactions)
        );
        localStorage.setItem("finwise_tags", JSON.stringify(data.tags));

        // Lade die Daten neu
        accountStore.loadAccounts();
        categoryStore.loadCategories();
        transactionStore.loadTransactions();
        planningStore.loadPlanningTransactions();
        tagStore.loadTags();

        alert("Daten erfolgreich importiert");
      }
    } catch (error) {
      alert("Fehler beim Importieren der Daten: " + (error as Error).message);
    }

    // Setze das Datei-Input zurück
    input.value = "";
  };

  reader.readAsText(file);
};

// Daten zurücksetzen
const resetData = () => {
  if (
    confirm(
      "Möchten Sie wirklich alle Daten zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden."
    )
  ) {
    localStorage.removeItem("finwise_accounts");
    localStorage.removeItem("finwise_account_groups");
    localStorage.removeItem("finwise_categories");
    localStorage.removeItem("finwise_category_groups");
    localStorage.removeItem("finwise_transactions");
    localStorage.removeItem("finwise_planning_transactions");
    localStorage.removeItem("finwise_tags");
    localStorage.removeItem("finwise_category_transfers");

    // Lade die Daten neu
    accountStore.loadAccounts();
    categoryStore.loadCategories();
    transactionStore.loadTransactions();
    planningStore.loadPlanningTransactions();
    tagStore.loadTags();

    alert("Alle Daten wurden zurückgesetzt");
  }
};
</script>

<template>
  <div>
    <h2 class="text-xl font-bold mb-6">Einstellungen</h2>

    <!-- Erscheinungsbild -->
    <div class="card bg-base-100 shadow-md mb-6">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Erscheinungsbild</h3>

        <div class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text">Dunkles Design</span>
            <input
              type="checkbox"
              class="toggle toggle-primary"
              :checked="themeStore.isDarkMode"
              @change="themeStore.toggleTheme()"
            />
          </label>
        </div>
      </div>
    </div>

    <!-- Debug Logging -->
    <div class="card bg-base-100 shadow-md mb-6">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Debug Logging</h3>
        <div class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text">Debug Logging aktivieren</span>
            <input
              type="checkbox"
              class="toggle toggle-primary"
              :checked="debugFlag"
              @change="toggleDebug"
            />
          </label>
        </div>
      </div>
    </div>

    <!-- Daten -->
    <div class="card bg-base-100 shadow-md mb-6">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Daten</h3>

        <div class="flex flex-col md:flex-row gap-4">
          <button class="btn btn-primary" @click="exportData">
            <span class="iconify mr-2" data-icon="mdi:download"></span>
            Daten exportieren
          </button>

          <div class="form-control">
            <label class="btn btn-outline">
              <span class="iconify mr-2" data-icon="mdi:upload"></span>
              Daten importieren
              <input
                type="file"
                accept=".json"
                class="hidden"
                @change="importData"
              />
            </label>
          </div>

          <button class="btn btn-error" @click="resetData">
            <span class="iconify mr-2" data-icon="mdi:delete"></span>
            Alle Daten zurücksetzen
          </button>
        </div>
      </div>
    </div>

    <!-- Statistiken -->
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Statistiken</h3>

        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <tbody>
              <tr>
                <td>Konten</td>
                <td>{{ stats.accounts }}</td>
              </tr>
              <tr>
                <td>Kontogruppen</td>
                <td>{{ stats.accountGroups }}</td>
              </tr>
              <tr>
                <td>Kategorien</td>
                <td>{{ stats.categories }}</td>
              </tr>
              <tr>
                <td>Kategoriegruppen</td>
                <td>{{ stats.categoryGroups }}</td>
              </tr>
              <tr>
                <td>Transaktionen</td>
                <td>{{ stats.transactions }}</td>
              </tr>
              <tr>
                <td>Geplante Transaktionen</td>
                <td>{{ stats.planningTransactions }}</td>
              </tr>
              <tr>
                <td>Tags</td>
                <td>{{ stats.tags }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Über -->
    <div class="card bg-base-100 shadow-md mt-6">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Über FinWise</h3>

        <p>
          FinWise ist eine persönliche Finanzverwaltungsanwendung, die Ihnen
          hilft, Ihre Finanzen zu verwalten und zu planen.
        </p>

        <div class="mt-4">
          <p class="text-sm text-base-content/70">Version: 0.1.0</p>
          <p class="text-sm text-base-content/70">
            © {{ new Date().getFullYear() }} - FinWise
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
