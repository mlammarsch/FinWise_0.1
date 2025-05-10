<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/transaction/TransactionImportModal.vue
 * CSV-Importer für Transaktionen, ermöglicht Import von CSV-Dateien mit Transaktionsdaten.
 *
 * Komponenten-Props:
 * - isOpen: boolean - Steuert die Sichtbarkeit des Modals
 * - accountId: string - ID des Kontos, zu dem importiert wird
 *
 * Emits:
 * - close: Schließt den Dialog
 * - imported: Wird nach erfolgreichem Import ausgelöst, überträgt die Anzahl importierter Transaktionen
 */
import { ref, computed, onMounted, watch } from "vue";
import { useCategoryStore } from "@/stores/categoryStore";
import { useRecipientStore } from "@/stores/recipientStore";
import { useAccountStore } from "@/stores/accountStore";
import { useTransactionStore } from "@/stores/transactionStore";
import CurrencyDisplay from "@/components/ui/CurrencyDisplay.vue";
import SelectCategory from "@/components/ui/SelectCategory.vue";
import SelectRecipient from "@/components/ui/SelectRecipient.vue";
import PagingComponent from "@/components/ui/PagingComponent.vue";
import { debugLog, infoLog } from "@/utils/logger";
import { TransactionService } from "@/services/TransactionService";
import { formatDate } from "@/utils/formatters";
import { calculateStringSimilarity } from "@/utils/csvUtils";

const props = defineProps<{
  isOpen: boolean;
  accountId: string;
}>();

const emit = defineEmits(["close", "imported"]);

// Stores
const categoryStore = useCategoryStore();
const recipientStore = useRecipientStore();
const accountStore = useAccountStore();
const transactionStore = useTransactionStore();

// CSV Konfiguration
const csvFile = ref<File | null>(null);
const csvData = ref<string>("");
const delimiter = ref<string>(",");
const customDelimiter = ref<string>("");
const hasTitleRow = ref<boolean>(true);
const dateFormat = ref<string>("YYYY-MM-DD");
const mergeExisting = ref<boolean>(true);

// Verarbeitungs-Status
const isProcessing = ref<boolean>(false);
const csvParseStatus = ref<"idle" | "parsing" | "error" | "success">("idle");
const csvPreviewData = ref<any[]>([]);
const csvHeaders = ref<string[]>([]);
const error = ref<string>("");

// Paginierung für Vorschau
const currentPage = ref(1);
const itemsPerPage = ref<number>(10);
const totalPages = computed(() =>
  Math.ceil(csvPreviewData.value.length / itemsPerPage.value)
);
const paginatedPreviewData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return csvPreviewData.value.slice(start, start + itemsPerPage.value);
});

// Mappings
const mappedColumns = ref<{ [key: string]: string }>({});
const possibleMappings = ref<{ [key: string]: string[] }>({
  date: [],
  amount: [],
  notes: [],
  recipient: [],
  category: [],
});

// Mehrfachauswahl mit Shift-Taste
const lastSelectedIndex = ref<number | null>(null);

// Import-Ergebnisse
const importedTransactions = ref<any[]>([]);
const importStatus = ref<"idle" | "importing" | "error" | "success">("idle");

/**
 * Sucht nach ähnlichen Entitäten basierend auf einem Namen
 */
function findSimilarEntities(
  name: string,
  type: "recipient" | "category"
): { id: string; name: string; similarity: number }[] {
  if (!name || name.trim() === "") return [];

  const entities =
    type === "recipient" ? recipientStore.recipients : categoryStore.categories;

  const targetName = name.toLowerCase();

  return entities
    .map((entity) => {
      const entityName = entity.name.toLowerCase();
      // Ähnlichkeitsbewertung
      let similarity = calculateStringSimilarity(entityName, targetName);

      return {
        id: entity.id,
        name: entity.name,
        similarity,
      };
    })
    .filter((result) => result.similarity > 0.2)
    .sort((a, b) => b.similarity - a.similarity);
}

// Datei-Upload
function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  csvData.value = "";
  csvFile.value = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    if (e.target?.result) {
      csvData.value = e.target.result as string;
      parseCSV();
    }
  };

  reader.readAsText(csvFile.value);
}

// CSV Parsing
function parseCSV() {
  if (!csvData.value) {
    error.value = "Keine CSV-Daten vorhanden.";
    return;
  }

  csvParseStatus.value = "parsing";
  error.value = "";

  try {
    const effectiveDelimiter =
      delimiter.value === "custom" ? customDelimiter.value : delimiter.value;
    const rows = csvData.value.split(/\r?\n/);

    if (rows.length === 0) {
      throw new Error("Die CSV-Datei enthält keine Zeilen.");
    }

    // Header extrahieren
    let startRow = 0;
    let headers: string[] = [];

    if (hasTitleRow.value) {
      headers = rows[0].split(effectiveDelimiter).map((h) => h.trim());
      startRow = 1;
    } else {
      // Generiere Spaltenbezeichnungen
      const firstRow = rows[0].split(effectiveDelimiter);
      headers = firstRow.map((_, idx) => `Spalte ${idx + 1}`);
    }

    csvHeaders.value = headers;

    // Daten verarbeiten
    const data: any[] = [];

    for (let i = startRow; i < rows.length; i++) {
      const rowStr = rows[i].trim();
      if (!rowStr) continue; // Leere Zeilen überspringen

      const rowValues = rowStr
        .split(effectiveDelimiter)
        .map((val) => val.trim());

      // Überspringe Zeilen mit falscher Spaltenanzahl
      if (rowValues.length !== headers.length) {
        continue;
      }

      const rowObject: any = {
        _originalIndex: i,
        _selected: true,
        _potentialMerge: null,
      };

      headers.forEach((header, idx) => {
        rowObject[header] = rowValues[idx];
      });

      data.push(rowObject);
    }

    csvPreviewData.value = data;

    // Automatisches Mapping versuchen
    identifyPossibleMappings();
    automaticMapping();

    // Potenzielle Merge-Kandidaten identifizieren
    if (mergeExisting.value) {
      identifyPotentialMerges();
    }

    csvParseStatus.value = "success";
  } catch (err) {
    debugLog("[TransactionImportModal] CSV Parse Error", JSON.stringify(err));
    csvParseStatus.value = "error";
    error.value = `Fehler beim Parsen der CSV-Datei: ${
      err instanceof Error ? err.message : "Unbekannter Fehler"
    }`;
  }
}

// Identifiziert mögliche Mappings für Spalten
function identifyPossibleMappings() {
  if (csvPreviewData.value.length === 0 || csvHeaders.value.length === 0)
    return;

  // Zurücksetzen der möglichen Mappings
  possibleMappings.value = {
    date: [],
    amount: [],
    notes: [],
    recipient: [],
    category: [],
  };

  // Erste Zeile für Analyse der Datentypen verwenden
  const firstRow = csvPreviewData.value[0];

  csvHeaders.value.forEach((header) => {
    const value = firstRow[header].toString().trim();

    // Datum erkennen (unterschiedliche Formate)
    if (
      /^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}$/.test(value) || // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
      /^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}$/.test(value) || // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
      /^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2}$/.test(value) // DD-MM-YY, DD/MM/YY, DD.MM.YY
    ) {
      possibleMappings.value.date.push(header);
    }

    // Betrag erkennen
    if (/^-?\d+([,\.]\d+)?$/.test(value)) {
      possibleMappings.value.amount.push(header);
    }

    // Empfänger erkennen (Heuristik: längere Texte, normalerweise unter 60 Zeichen)
    if (
      value.length > 0 &&
      value.length < 60 &&
      !/^\d+([,\.]\d+)?$/.test(value) &&
      !/^\d{1,2}[-/\.]\d{1,2}/.test(value)
    ) {
      possibleMappings.value.recipient.push(header);
    }

    // Kategorie erkennen (ähnlich wie Empfänger, aber tendenziell kürzer)
    if (
      value.length > 0 &&
      value.length < 30 &&
      !/^\d+([,\.]\d+)?$/.test(value) &&
      !/^\d{1,2}[-/\.]\d{1,2}/.test(value)
    ) {
      possibleMappings.value.category.push(header);
    }

    // Notizen erkennen (tendenziell längere Texte)
    if (
      value.length > 0 &&
      !/^\d+([,\.]\d+)?$/.test(value) &&
      !/^\d{1,2}[-/\.]\d{1,2}/.test(value)
    ) {
      possibleMappings.value.notes.push(header);
    }
  });

  debugLog(
    "[TransactionImportModal] Erkannte mögliche Mappings",
    JSON.stringify(possibleMappings.value)
  );
}

// Automatisches Mapping basierend auf Heuristiken
function automaticMapping() {
  // Zurücksetzen des Mappings
  mappedColumns.value = {};

  // Automatisches Mapping für Datum (höchste Priorität)
  if (possibleMappings.value.date.length > 0) {
    // Wenn ein Header "Datum" oder ähnliches enthält, diesen bevorzugen
    const dateHeader =
      possibleMappings.value.date.find(
        (h) =>
          h.toLowerCase().includes("datum") ||
          h.toLowerCase().includes("date") ||
          h.toLowerCase().includes("valuta") ||
          h.toLowerCase().includes("wert")
      ) || possibleMappings.value.date[0];

    mappedColumns.value.date = dateHeader;
  }

  // Automatisches Mapping für Betrag
  if (possibleMappings.value.amount.length > 0) {
    // Wenn ein Header "Betrag" oder ähnliches enthält, diesen bevorzugen
    const amountHeader =
      possibleMappings.value.amount.find(
        (h) =>
          h.toLowerCase().includes("betrag") ||
          h.toLowerCase().includes("summe") ||
          h.toLowerCase().includes("amount") ||
          h.toLowerCase().includes("geldeingang") ||
          h.toLowerCase().includes("geldausgang")
      ) || possibleMappings.value.amount[0];

    mappedColumns.value.amount = amountHeader;
  }

  // Wir versuchen nicht automatisch Empfänger, Kategorie oder Notizen zu mappen,
  // da dies zu unsicher ist und besser manuell erfolgen sollte
}

// Parse ein Datum gemäß dem gewählten Format
function parseDate(dateString: string): string | null {
  if (!dateString) return null;

  try {
    const dateStr = dateString.trim();
    let year: string | number, month: string | number, day: string | number;

    // Extrahiere Trennzeichen (-, /, .)
    const separator = dateStr.match(/[-/.]/)?.[0] || "-";

    switch (dateFormat.value) {
      case "YYYY-MM-DD":
        [year, month, day] = dateStr.split(separator);
        break;
      case "YY-MM-DD":
        [year, month, day] = dateStr.split(separator);
        year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        break;
      case "MM-DD-YYYY":
        [month, day, year] = dateStr.split(separator);
        break;
      case "MM-DD-YY":
        [month, day, year] = dateStr.split(separator);
        year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        break;
      case "DD-MM-YYYY":
        [day, month, year] = dateStr.split(separator);
        break;
      case "DD-MM-YY":
        [day, month, year] = dateStr.split(separator);
        year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        break;
      default:
        return null;
    }

    // Formatiere das Datum im ISO-Format (YYYY-MM-DD)
    month = month.padStart(2, "0");
    day = day.padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch (error) {
    debugLog(
      "[TransactionImportModal] Error parsing date",
      JSON.stringify(error)
    );
    return null;
  }
}

// Parse einen Betrag aus dem CSV
function parseAmount(amountString: string): number | null {
  if (!amountString) return null;

  try {
    // Bereinigen und normalisieren
    let cleanedAmount = amountString
      .trim()
      .replace(/\s/g, "") // Leerzeichen entfernen
      .replace(/[^\d,.+-]/g, "") // Nur Zahlen, Komma, Punkt, Plus, Minus behalten
      .replace(/\.(?=.*\.)/g, ""); // Nur den letzten Punkt behalten

    // Umwandlung von deutschem in englisches Zahlenformat
    cleanedAmount = cleanedAmount.replace(/,/g, ".");

    return parseFloat(cleanedAmount);
  } catch (error) {
    debugLog(
      "[TransactionImportModal] Error parsing amount",
      JSON.stringify(error)
    );
    return null;
  }
}

// Identifiziere potenziell doppelte Transaktionen
function identifyPotentialMerges() {
  if (!mappedColumns.value.date || !mappedColumns.value.amount) return;

  csvPreviewData.value.forEach((row) => {
    const dateStr = row[mappedColumns.value.date];
    const amountStr = row[mappedColumns.value.amount];

    const parsedDate = parseDate(dateStr);
    const parsedAmount = parseAmount(amountStr);

    if (!parsedDate || parsedAmount === null) return;

    // Empfänger und Notizen aus der Zeile extrahieren (falls gemappt)
    let recipientName = "";
    let notes = "";
    if (mappedColumns.value.recipient) {
      recipientName = row[mappedColumns.value.recipient];
    }
    if (mappedColumns.value.notes) {
      notes = row[mappedColumns.value.notes];
    }

    // Suche nach ähnlichen Transaktionen
    const potentialMatches = transactionStore.transactions.filter((tx) => {
      // Gleicher Tag
      const sameDate = tx.date.substring(0, 10) === parsedDate.substring(0, 10);

      // Ungefähr gleicher Betrag (Toleranz von 0.01)
      const sameAmount = Math.abs(tx.amount - parsedAmount) < 0.01;

      // Ähnlicher Empfänger oder Notiz, falls verfügbar
      let similarRecipientOrNote = true;
      if ((recipientName || notes) && tx.recipientId) {
        const txRecipient = recipientStore.getRecipientById(tx.recipientId);
        if (txRecipient) {
          // Prüfen ob Empfängername ähnlich ist
          const recipientSimilarity = recipientName
            ? calculateStringSimilarity(txRecipient.name, recipientName)
            : 0;

          // Oder wenn Notiz ähnlich ist mit dem Empfängernamen
          const noteSimilarity = notes
            ? calculateStringSimilarity(txRecipient.name, notes)
            : 0;

          similarRecipientOrNote =
            recipientSimilarity > 0.3 || noteSimilarity > 0.3;
        }
      }

      return sameDate && sameAmount && similarRecipientOrNote;
    });

    if (potentialMatches.length > 0) {
      row._potentialMerge = potentialMatches[0];
    }
  });
}

// Bereite Daten für den Import vor
function prepareDataForImport() {
  const preparedData = [];

  for (const row of csvPreviewData.value) {
    // Überspringe nicht ausgewählte Zeilen
    if (!row._selected) continue;

    const dateValue = mappedColumns.value.date
      ? parseDate(row[mappedColumns.value.date])
      : null;
    const amountValue = mappedColumns.value.amount
      ? parseAmount(row[mappedColumns.value.amount])
      : null;

    // Pflichtfelder prüfen
    if (!dateValue || amountValue === null) {
      continue;
    }

    const rowData = {
      date: dateValue,
      valueDate: dateValue,
      amount: amountValue,
      note: mappedColumns.value.notes ? row[mappedColumns.value.notes] : "",
      recipient: {
        id: null as string | null,
        name: mappedColumns.value.recipient
          ? row[mappedColumns.value.recipient]
          : "",
        isNew: false,
      },
      category: {
        id: null as string | null,
        name: mappedColumns.value.category
          ? row[mappedColumns.value.category]
          : "",
        isNew: false,
      },
      accountId: props.accountId,
      tagIds: [] as string[],
      potentialMerge: row._potentialMerge,
    };

    // Empfänger zuordnen wenn gemapped
    if (row.recipientId) {
      rowData.recipient.id = row.recipientId;
      rowData.recipient.isNew = false;
    } else if (rowData.recipient.name && row.createNewRecipient) {
      rowData.recipient.isNew = true;
    }

    // Kategorie zuordnen wenn gemapped
    if (row.categoryId) {
      rowData.category.id = row.categoryId;
      rowData.category.isNew = false;
    } else if (rowData.category.name && row.createNewCategory) {
      rowData.category.isNew = true;
    }

    preparedData.push(rowData);
  }

  return preparedData;
}

// Automatische Zuordnung von Empfängern über mehrere Zeilen
function applyRecipientToSimilarRows(
  recipientId: string,
  recipientName: string
) {
  if (!mappedColumns.value.recipient) return;

  // Suche ähnliche Einträge in allen Zeilen und weise den gleichen Empfänger zu
  csvPreviewData.value.forEach((row) => {
    const rowRecipient = row[mappedColumns.value.recipient];
    if (rowRecipient && rowRecipient === recipientName && !row.recipientId) {
      row.recipientId = recipientId;
    }
  });
}

// Event-Handler für Checkbox-Auswahl mit Shift
function handleRowSelection(row: any, index: number, event: MouseEvent) {
  const target = event.target as HTMLInputElement;
  const isChecked = target.checked;

  if (event.shiftKey && lastSelectedIndex.value !== null) {
    // Range-Auswahl mit Shift-Taste
    const start = Math.min(lastSelectedIndex.value, index);
    const end = Math.max(lastSelectedIndex.value, index);

    for (let i = start; i <= end; i++) {
      if (i < csvPreviewData.value.length) {
        csvPreviewData.value[i]._selected = isChecked;
      }
    }
  } else {
    // Einzelauswahl
    row._selected = isChecked;
  }

  lastSelectedIndex.value = index;
}

// Alle Zeilen auswählen oder abwählen
function toggleAllRows(event: Event) {
  const target = event.target as HTMLInputElement;
  const isChecked = target.checked;

  csvPreviewData.value.forEach((row) => {
    row._selected = isChecked;
  });

  lastSelectedIndex.value = null;
}

// Startet den Import-Prozess
async function startImport() {
  if (csvParseStatus.value !== "success" || csvPreviewData.value.length === 0) {
    error.value = "Es gibt keine gültigen Daten zum Importieren.";
    return;
  }

  importStatus.value = "importing";
  error.value = "";
  importedTransactions.value = [];

  try {
    const preparedData = prepareDataForImport();

    debugLog(
      "[TransactionImportModal] Starting import of",
      preparedData.length,
      "transactions"
    );

    for (const item of preparedData) {
      let recipientId = item.recipient.id;
      let categoryId = item.category.id;

      // Neuen Empfänger erstellen, falls nötig
      if (item.recipient.isNew && item.recipient.name) {
        const newRecipient = recipientStore.addRecipient({
          name: item.recipient.name,
        });
        recipientId = newRecipient.id;
      }

      // Neue Kategorie erstellen, falls nötig
      if (item.category.isNew && item.category.name) {
        const newCategory = categoryStore.addCategory({
          name: item.category.name,
          parentCategoryId: null,
          sortOrder: categoryStore.categories.length,
          isIncomeCategory: item.amount > 0,
        });
        categoryId = newCategory.id;
      }

      // Bestimme Transaktionstyp basierend auf Betrag
      const txType = item.amount < 0 ? "EXPENSE" : "INCOME";

      // Transaktion erstellen
      const newTransaction = TransactionService.addTransaction({
        date: item.date,
        valueDate: item.valueDate,
        accountId: props.accountId,
        categoryId: categoryId || null,
        tagIds: item.tagIds,
        amount: item.amount,
        note: item.note,
        recipientId: recipientId,
        type: txType,
        counterTransactionId: null,
        planningTransactionId: null,
        isReconciliation: false,
      });

      // Erfolgreich importierte Transaktion speichern
      importedTransactions.value.push({
        ...newTransaction,
        recipientName: recipientId
          ? recipientStore.getRecipientById(recipientId)?.name
          : item.recipient.name,
        categoryName: categoryId
          ? categoryStore.getCategoryById(categoryId)?.name
          : item.category.name,
        accountName: accountStore.getAccountById(props.accountId)?.name || "",
      });
    }

    infoLog(
      "[TransactionImportModal]",
      `${importedTransactions.value.length} Transaktionen erfolgreich importiert.`
    );
    importStatus.value = "success";
    emit("imported", importedTransactions.value.length);
  } catch (err) {
    debugLog("[TransactionImportModal] Import Error", JSON.stringify(err));
    importStatus.value = "error";
    error.value = `Fehler beim Import: ${
      err instanceof Error ? err.message : "Unbekannter Fehler"
    }`;
  }
}

// Reagieren auf Änderungen der Konfig und neu parsen
watch([delimiter, customDelimiter, hasTitleRow, dateFormat], () => {
  if (csvData.value) {
    parseCSV();
  }
});

// Reagieren auf Änderung der Merge-Option
watch(mergeExisting, (newValue) => {
  if (newValue && csvPreviewData.value.length > 0) {
    identifyPotentialMerges();
  } else {
    // Potenzielle Merges zurücksetzen
    csvPreviewData.value.forEach((row) => {
      row._potentialMerge = null;
    });
  }
});

// Empfänger-Änderung überwachen und bei Änderungen auf ähnliche Zeilen anwenden
watch(csvPreviewData, {
  deep: true,
  handler(newData) {
    newData.forEach((row) => {
      // Wenn ein Empfänger neu zugewiesen wurde und der Mappping-Name bekannt ist
      if (row.recipientId && mappedColumns.value.recipient) {
        const recipientName = row[mappedColumns.value.recipient];
        const recipientId = row.recipientId;
        if (recipientName && recipientId) {
          applyRecipientToSimilarRows(recipientId, recipientName);
        }
      }
    });
  },
});
</script>

<template>
  <div v-if="isOpen" class="modal modal-open z-50" tabindex="-1" role="dialog">
    <div class="modal-box max-w-5xl max-h-[90vh] overflow-auto">
      <h3 class="font-bold text-xl mb-4">CSV-Datei importieren</h3>

      <!-- Upload und Konfiguration -->
      <div class="space-y-6 mb-6">
        <!-- Formular für Datei-Upload und Konfiguration -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Datei-Upload -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">CSV-Datei auswählen</legend>
            <div class="form-control mb-4">
              <input
                type="file"
                accept=".csv"
                class="file-input file-input-bordered w-full"
                @change="handleFileUpload"
                :disabled="isProcessing"
              />
            </div>
          </fieldset>

          <!-- CSV-Konfiguration -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">CSV-Konfiguration</legend>
            <div class="space-y-4">
              <!-- Delimiter -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Trennzeichen</span>
                </label>
                <select
                  v-model="delimiter"
                  class="select select-bordered w-full"
                  :disabled="isProcessing"
                >
                  <option value=",">Komma (,)</option>
                  <option value=";">Semikolon (;)</option>
                  <option value="\t">Tabulator</option>
                  <option value="custom">Benutzerdefiniert</option>
                </select>
                <input
                  v-if="delimiter === 'custom'"
                  v-model="customDelimiter"
                  type="text"
                  class="input input-bordered mt-2 w-full max-w-xs"
                  maxlength="1"
                  placeholder="Eigenes Trennzeichen"
                  :disabled="isProcessing"
                />
              </div>

              <!-- Datumsformat -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Datumsformat</span>
                </label>
                <select
                  v-model="dateFormat"
                  class="select select-bordered w-full"
                  :disabled="isProcessing"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="YY-MM-DD">YY-MM-DD</option>
                  <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                  <option value="MM-DD-YY">MM-DD-YY</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  <option value="DD-MM-YY">DD-MM-YY</option>
                </select>
                <p class="text-xs text-base-content/70 mt-1">
                  Hinweis: Als Trennzeichen im Datum sind -, / und . erlaubt.
                </p>
              </div>
            </div>
          </fieldset>
        </div>

        <!-- Weitere Optionen -->
        <div class="card bg-base-200 p-4 rounded-lg">
          <div class="flex flex-wrap gap-6">
            <div class="form-control">
              <label class="label cursor-pointer">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  v-model="hasTitleRow"
                  :disabled="isProcessing"
                />
                <span class="label-text ml-2"
                  >Erste Zeile enthält Überschriften</span
                >
              </label>
            </div>
            <div class="form-control">
              <label class="label cursor-pointer">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  v-model="mergeExisting"
                  :disabled="isProcessing"
                />
                <span class="label-text ml-2"
                  >Mit bestehenden Transaktionen zusammenführen</span
                >
              </label>
            </div>
          </div>
        </div>

        <div v-if="error" class="alert alert-error">
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Mapping und Vorschau -->
      <div
        v-if="csvParseStatus === 'success' && csvPreviewData.length > 0"
        class="space-y-8 mb-6"
      >
        <h4 class="font-bold text-lg pt-4">Daten-Mapping</h4>

        <!-- Mapping-Formular -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <!-- Spalte Datum -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Buchungsdatum<span class="text-error">*</span>
            </legend>
            <select
              v-model="mappedColumns.date"
              class="select select-bordered w-full"
              :class="{ 'select-error': !mappedColumns.date }"
              :disabled="isProcessing"
            >
              <option value="">-- Bitte auswählen --</option>
              <option
                v-for="header in csvHeaders"
                :key="header"
                :value="header"
              >
                {{ header }}
              </option>
            </select>
          </fieldset>

          <!-- Spalte Betrag -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Betrag<span class="text-error">*</span>
            </legend>
            <select
              v-model="mappedColumns.amount"
              class="select select-bordered w-full"
              :class="{ 'select-error': !mappedColumns.amount }"
              :disabled="isProcessing"
            >
              <option value="">-- Bitte auswählen --</option>
              <option
                v-for="header in csvHeaders"
                :key="header"
                :value="header"
              >
                {{ header }}
              </option>
            </select>
          </fieldset>

          <!-- Spalte Empfänger -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Empfänger</legend>
            <select
              v-model="mappedColumns.recipient"
              class="select select-bordered w-full"
              :disabled="isProcessing"
            >
              <option value="">-- Nicht importieren --</option>
              <option
                v-for="header in csvHeaders"
                :key="header"
                :value="header"
              >
                {{ header }}
              </option>
            </select>
          </fieldset>

          <!-- Spalte Kategorie -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Kategorie</legend>
            <select
              v-model="mappedColumns.category"
              class="select select-bordered w-full"
              :disabled="isProcessing"
            >
              <option value="">-- Nicht importieren --</option>
              <option
                v-for="header in csvHeaders"
                :key="header"
                :value="header"
              >
                {{ header }}
              </option>
            </select>
          </fieldset>

          <!-- Spalte Notizen -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Notizen</legend>
            <select
              v-model="mappedColumns.notes"
              class="select select-bordered w-full"
              :disabled="isProcessing"
            >
              <option value="">-- Nicht importieren --</option>
              <option
                v-for="header in csvHeaders"
                :key="header"
                :value="header"
              >
                {{ header }}
              </option>
            </select>
          </fieldset>
        </div>

        <!-- Datenvorschau -->
        <div>
          <h4 class="font-bold text-lg mb-4">Datenvorschau</h4>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      :checked="csvPreviewData.every((row) => row._selected)"
                      @change="toggleAllRows"
                      :disabled="isProcessing"
                    />
                  </th>
                  <th>Datum</th>
                  <th>Betrag</th>
                  <th>Empfänger</th>
                  <th>Kategorie</th>
                  <th>Notizen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in paginatedPreviewData" :key="index">
                  <td>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      v-model="row._selected"
                      @click="(event) => handleRowSelection(row, index, event)"
                      :disabled="isProcessing"
                    />
                  </td>
                  <td>
                    {{ mappedColumns.date ? row[mappedColumns.date] : "—" }}
                    <div
                      class="text-xs text-base-content/70"
                      v-if="
                        mappedColumns.date && parseDate(row[mappedColumns.date])
                      "
                    >
                      {{ formatDate(parseDate(row[mappedColumns.date]) || "") }}
                    </div>
                    <div
                      class="text-xs text-error"
                      v-else-if="
                        mappedColumns.date &&
                        !parseDate(row[mappedColumns.date])
                      "
                    >
                      Ungültiges Datum
                    </div>
                  </td>
                  <td>
                    {{ mappedColumns.amount ? row[mappedColumns.amount] : "—" }}
                    <div
                      class="text-xs font-semibold"
                      v-if="
                        mappedColumns.amount &&
                        parseAmount(row[mappedColumns.amount]) !== null
                      "
                    >
                      <CurrencyDisplay
                        :amount="parseAmount(row[mappedColumns.amount]) || 0"
                      />
                    </div>
                    <div
                      class="text-xs text-error"
                      v-else-if="
                        mappedColumns.amount &&
                        parseAmount(row[mappedColumns.amount]) === null
                      "
                    >
                      Ungültiger Betrag
                    </div>
                  </td>
                  <td class="max-w-[200px]">
                    <div v-if="mappedColumns.recipient">
                      <div class="text-sm truncate max-w-[200px]">
                        {{ row[mappedColumns.recipient] }}
                      </div>

                      <!-- Empfänger-Mapping -->
                      <div class="mt-2" v-if="row[mappedColumns.recipient]">
                        <SelectRecipient
                          v-model="row.recipientId"
                          @create="(data) => (row.createNewRecipient = true)"
                          placeholder="Empfänger zuordnen..."
                        />
                      </div>
                    </div>
                    <div v-else class="text-base-content/30">—</div>
                  </td>
                  <td>
                    <div v-if="mappedColumns.category">
                      <div class="text-sm truncate max-w-[200px]">
                        {{ row[mappedColumns.category] }}
                      </div>

                      <!-- Kategorie-Mapping -->
                      <div class="mt-2" v-if="row[mappedColumns.category]">
                        <SelectCategory
                          v-model="row.categoryId"
                          placeholder="Kategorie zuordnen..."
                        />
                      </div>
                    </div>
                    <div v-else class="text-base-content/30">—</div>
                  </td>
                  <td>
                    <div
                      v-if="mappedColumns.notes"
                      class="truncate max-w-[200px]"
                    >
                      {{ row[mappedColumns.notes] }}
                    </div>
                    <div v-else class="text-base-content/30">—</div>
                  </td>
                  <td class="text-center">
                    <!-- Status für potenzielle Duplikate -->
                    <div
                      v-if="row._potentialMerge"
                      class="tooltip tooltip-left"
                      data-tip="Ähnliche Buchung bereits vorhanden"
                    >
                      <Icon
                        icon="mdi:alert-circle"
                        class="text-warning text-xl"
                      />
                      <div class="text-xs mt-1 font-medium">
                        {{ formatDate(row._potentialMerge.date) }}
                        <CurrencyDisplay :amount="row._potentialMerge.amount" />
                      </div>
                    </div>
                    <!-- Normale Buchung -->
                    <div
                      v-else-if="
                        mappedColumns.date &&
                        mappedColumns.amount &&
                        parseDate(row[mappedColumns.date]) &&
                        parseAmount(row[mappedColumns.amount]) !== null
                      "
                    >
                      <Icon
                        icon="mdi:check-circle"
                        class="text-success text-xl"
                      />
                    </div>
                    <!-- Fehler bei der Validierung -->
                    <div v-else>
                      <Icon
                        icon="mdi:alert-circle"
                        class="text-error text-xl"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Paginierung für die Vorschau -->
            <PagingComponent
              :currentPage="currentPage"
              :totalPages="totalPages"
              :itemsPerPage="itemsPerPage"
              @update:currentPage="(page) => (currentPage = page)"
              @update:itemsPerPage="(val) => (itemsPerPage = val)"
            />
          </div>
        </div>
      </div>

      <!-- Erfolgsmeldung nach Import -->
      <div v-if="importStatus === 'success'" class="alert alert-success mt-6">
        <Icon icon="mdi:check-circle-outline" class="text-xl mr-2" />
        <span
          >{{ importedTransactions.length }} Transaktionen erfolgreich
          importiert!</span
        >
      </div>

      <!-- Ergebnistabelle nach erfolgreichem Import -->
      <div
        v-if="importStatus === 'success' && importedTransactions.length > 0"
        class="mt-6"
      >
        <h4 class="font-bold text-lg mb-4">Importierte Transaktionen</h4>
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Empfänger</th>
                <th>Kategorie</th>
                <th>Betrag</th>
                <th>Notizen</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(tx, index) in importedTransactions.slice(0, 10)"
                :key="index"
              >
                <td>{{ formatDate(tx.date) }}</td>
                <td>{{ tx.recipientName || "—" }}</td>
                <td>{{ tx.categoryName || "—" }}</td>
                <td>
                  <CurrencyDisplay :amount="tx.amount" />
                </td>
                <td class="truncate max-w-[200px]">{{ tx.note || "—" }}</td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="importedTransactions.length > 10"
            class="py-4 text-center text-base-content/70"
          >
            Es werden nur die ersten 10 Transaktionen angezeigt. Insgesamt
            wurden {{ importedTransactions.length }} Transaktionen importiert.
          </div>
        </div>
      </div>

      <!-- Fehler beim Import -->
      <div v-if="importStatus === 'error'" class="alert alert-error mt-6">
        <Icon icon="mdi:alert-circle-outline" class="text-xl mr-2" />
        <span>{{ error }}</span>
      </div>

      <!-- Aktionen -->
      <div class="modal-action mt-8">
        <button
          class="btn btn-outline"
          @click="emit('close')"
          :disabled="isProcessing"
        >
          {{ importStatus === "success" ? "Schließen" : "Abbrechen" }}
        </button>

        <!-- Zeige Import-Button nur wenn Parsing erfolgreich und noch nicht importiert -->
        <button
          v-if="csvParseStatus === 'success' && importStatus !== 'success'"
          class="btn btn-primary"
          @click="startImport"
          :disabled="
            isProcessing ||
            !mappedColumns.date ||
            !mappedColumns.amount ||
            importStatus === 'importing'
          "
        >
          <span v-if="importStatus === 'importing'">
            <Icon icon="mdi:loading" class="animate-spin mr-2" />
            Importiere...
          </span>
          <span v-else> Importieren </span>
        </button>
      </div>
    </div>
    <div
      class="modal-backdrop bg-base-300 opacity-80"
      @click="emit('close')"
    ></div>
  </div>
</template>

<style scoped>
.fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

.fieldset-legend {
  font-weight: 600;
  padding-bottom: 0.5rem;
  font-size: 0.875rem;
  color: hsl(var(--bc) / 0.7);
}

.select-error {
  border-color: hsl(var(--er));
}
</style>
