Ich bekomme in der Accountsview bei Klick auf eine AccountCard nicht die zugehörigen Buchungen angezeigt.
Prüfe dazu auch die Transaction Cards.

Schaue in die MonthSelector. Ich habe das Gefühl, die Datumsformate stimmen nicht. Hier eine Voranalyse.

Problem liegt sehr wahrscheinlich an deinem date-Vergleich im Filter
Wenn tx.date einen Zeitanteil oder null/undefined hat, schlägt dieser Vergleich fehl:

ts
Kopieren
Bearbeiten
const txDate = tx.date.split("T")[0]; // ← Fehleranfällig
✅ Robuster Fix
Setze das Datum wie der MonthSelector auch auf reines YYYY-MM-DD um:

ts
Kopieren
Bearbeiten
function normalizeDateString(date: string): string {
  return new Date(date).toISOString().split("T")[0];
}
Dann im Filter:

ts
Kopieren
Bearbeiten
if (dateRange.value.start && dateRange.value.end) {
  txs = txs.filter((tx) => {
    const txDate = normalizeDateString(tx.date);
    return txDate >= dateRange.value.start && txDate <= dateRange.value.end;
  });
}
Achte darauf, dass tx.date ein valides ISO-Date-Format ist oder du bekommst NaN.

Debug-Empfehlung
Ergänze:

ts
Kopieren
Bearbeiten
console.log("[FILTER] tx.date raw:", tx.date, "→", normalizeDateString(tx.date));
So siehst Du sofort, ob das tx.date korrekt ist.

Zusammenfassung
✅ MonthSelector gibt korrekt YYYY-MM-DD aus.

❌ dein bisheriger Filter verlässt sich auf split("T")[0], was bei nicht-ISO-Strings oder undefined fehlschlägt.

✅ Nutze stattdessen new Date(...).toISOString().split("T")[0] für Normierung.

🧪 Logge testweise ein paar Transaktionen, um den tatsächlichen Inhalt von tx.date zu prüfen.






Du:
Gib mir die veränderte Datei aus.


ChatGPT:
Bearbeitung angehalten





ChatGPT:
Hier ist die angepasste AccountsView.vue, bei der tx.date im Filter korrekt normiert wird:

vue
Kopieren
Bearbeiten

Hier ist möglicherweise der Fix in diesem Beispiel Code.
<script setup lang="ts">
import { ref, computed } from "vue";
import { useTransactionStore } from "@/stores/transactionStore";
import { useAccountStore } from "@/stores/accountStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTagStore } from "@/stores/tagStore";
import { useRecipientStore } from "@/stores/recipientStore";
import { TransactionType } from "@/types";
import { debugLog } from "@/utils/logger";

// Props und State
const selectedAccount = ref(null);
const selectedTransactionType = ref("");
const selectedReconciledFilter = ref("");
const selectedTagId = ref("");
const selectedCategoryId = ref("");
const searchQuery = ref("");
const dateRange = ref({ start: "", end: "" });

// Stores
const transactionStore = useTransactionStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

// Hilfsfunktion für Datum
function normalizeDateString(date: string): string {
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

// Filtered Transactions
const filteredTransactions = computed(() => {
  if (!selectedAccount.value) return [];

  let txs = transactionStore.transactions.filter((tx) => {
    // Nur Transaktionen für dieses Konto (auch bei Transfers nur eine Seite!)
    return (
      tx.accountId === selectedAccount.value.id &&
      [TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.ACCOUNTTRANSFER].includes(tx.type)
    );
  });

  // Typfilter
  if (selectedTransactionType.value) {
    const typeMap: Record<string, TransactionType> = {
      ausgabe: TransactionType.EXPENSE,
      einnahme: TransactionType.INCOME,
      transfer: TransactionType.ACCOUNTTRANSFER,
    };
    txs = txs.filter((tx) => tx.type === typeMap[selectedTransactionType.value]);
  }

  // Reconciled
  if (selectedReconciledFilter.value) {
    const target = selectedReconciledFilter.value === "abgeglichen";
    txs = txs.filter((tx) => tx.reconciled === target);
  }

  // Kategorie
  if (selectedCategoryId.value) {
    txs = txs.filter((tx) => tx.categoryId === selectedCategoryId.value);
  }

  // Tags
  if (selectedTagId.value) {
    txs = txs.filter((tx) => Array.isArray(tx.tagIds) && tx.tagIds.includes(selectedTagId.value));
  }

  // Datum
  if (dateRange.value.start && dateRange.value.end) {
    txs = txs.filter((tx) => {
      const txDate = normalizeDateString(tx.date);
      return txDate >= dateRange.value.start && txDate <= dateRange.value.end;
    });
  }

  // Freitextsuche
  if (searchQuery.value.trim()) {
    const lower = searchQuery.value.toLowerCase();
    const numeric = lower.replace(",", ".");
    txs = txs.filter((tx) => {
      const recipientName = tx.recipientId
        ? recipientStore.getRecipientById(tx.recipientId)?.name.toLowerCase() || ""
        : "";
      const categoryName = tx.categoryId
        ? categoryStore.getCategoryById(tx.categoryId)?.name.toLowerCase() || ""
        : "";
      const tags = Array.isArray(tx.tagIds)
        ? tx.tagIds.map((id) => tagStore.getTagById(id)?.name.toLowerCase() || "").join(" ")
        : "";
      const formattedAmount = ("" + tx.amount).replace(/\./g, "").replace(/,/g, ".");
      const note = tx.note?.toLowerCase() || "";
      return [recipientName, categoryName, tags, formattedAmount, note].some(
        (field) => field.includes(lower) || field.includes(numeric)
      );
    });
  }

  txs.sort((a, b) => normalizeDateString(b.date).localeCompare(normalizeDateString(a.date)));

  debugLog("[AccountView] filteredTransactions count", txs.length);
  return txs;
});
</script>
Änderungen:

normalizeDateString(...) ersetzt überall .split("T")[0]

transactionStore.transactions.filter(...) prüft explizit auf accountId === selectedAccount.value.id → nur eigene Buchungen

debugLog(...) ist erhalten für Kontrolle


Gib mir die ganze gefixte Datei aus.
