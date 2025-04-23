<!-- src/components/ui/SelectCategory.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/ui/SelectCategory.vue
 * Beschreibung: Generischer Kategorie-Select mit Volltextsuche.
 * Props:
 * - modelValue?: string - Bindung für v-model (Kategorie-ID)
 * - filterOutArray?: string[] - Auszuschließende Kategorie-IDs
 *
 * Emits:
 * - update:modelValue (newCategoryId: string | undefined): Neue Kategorie-ID oder undefined
 * - select (selectedCategoryId: string | undefined): Kategorie-ID bei Auswahl oder undefined
 */
import { ref, computed, watch, onMounted, nextTick, defineExpose } from "vue";
import { useCategoryStore } from "@/stores/categoryStore";
import CurrencyDisplay from "./CurrencyDisplay.vue";
import { debugLog } from "@/utils/logger";
import { useTransactionStore } from "@/stores/transactionStore";
import { calculateCategorySaldo } from "@/utils/runningBalances";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  modelValue?: string;
  filterOutArray?: string[];
}>();
const emit = defineEmits(["update:modelValue", "select"]);

const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();

const searchTerm = ref("");
const dropdownOpen = ref(false);
const highlightedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const selected = ref(props.modelValue || "");

/**
 * Initialisiert den Suchbegriff basierend auf der ausgewählten Kategorie-ID beim Laden.
 */
onMounted(() => {
  if (selected.value) {
    const cat = categoryStore.categories.find((c) => c.id === selected.value);
    if (cat) {
      searchTerm.value = cat.name;
      debugLog("[SelectCategory] onMounted → set searchTerm", {
        id: cat.id,
        name: cat.name,
      });
    }
  }
});

/**
 * Synchronisiert den lokalen Zustand (selected, searchTerm) mit Änderungen der modelValue-Prop.
 */
watch(
  () => props.modelValue,
  (newVal) => {
    selected.value = newVal || "";
    const cat = categoryStore.categories.find((c) => c.id === newVal);
    if (cat && searchTerm.value !== cat.name) {
      searchTerm.value = cat.name;
      debugLog("[SelectCategory] watch:modelValue → set searchTerm", {
        id: cat.id,
        name: cat.name,
      });
    } else if (!newVal && searchTerm.value && !dropdownOpen.value) {
      //searchTerm.value = ""; // Behalte Text bei
    }
  }
);

/**
 * Stößt das 'update:modelValue'-Event an, wenn sich die interne Auswahl ändert.
 */
watch(selected, (newVal) => {
  debugLog("[SelectCategory] watch:selected → emit update:modelValue", {
    newVal,
  });
  emit("update:modelValue", newVal || undefined);
  emit("select", newVal || undefined);
});

// Berechne aktuellen Monat für Saldoanzeige
const currentDate = new Date();
const currentMonthStart = new Date(
  currentDate.getFullYear(),
  currentDate.getMonth(),
  1
);
const currentMonthEnd = new Date(
  currentDate.getFullYear(),
  currentDate.getMonth() + 1,
  0
);

const availableCategory = computed(() =>
  categoryStore.getAvailableFundsCategory()
);

/**
 * Filtert Kategorien basierend auf filterOutArray und Suchbegriff.
 */
const filteredCategories = computed(() => {
  let cats = categoryStore.categories;
  if (props.filterOutArray?.length) {
    cats = cats.filter((cat) => !props.filterOutArray!.includes(cat.id));
  }
  if (availableCategory.value) {
    cats = cats.filter((cat) => cat.id !== availableCategory.value!.id);
  }
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase();
    cats = cats.filter((cat) => cat.name.toLowerCase().includes(term));
  }
  return cats;
});

const expenseCategories = computed(() =>
  filteredCategories.value
    .filter((cat) => !cat.isIncomeCategory)
    .sort((a, b) => a.name.localeCompare(b.name))
);

const incomeCategories = computed(() =>
  filteredCategories.value
    .filter((cat) => cat.isIncomeCategory)
    .sort((a, b) => a.name.localeCompare(b.name))
);

interface Option {
  isHeader: boolean;
  headerText?: string;
  category?: (typeof categoryStore.categories)[0];
}

/**
 * Erstellt die Liste der Dropdown-Optionen, gruppiert nach Einnahmen/Ausgaben.
 */
const options = computed<Option[]>(() => {
  const opts: Option[] = [];
  let includeAvailable = false;
  let availableMatchesSearch = false;

  if (availableCategory.value) {
    const isFilteredOut = props.filterOutArray?.includes(
      availableCategory.value.id
    );
    if (!isFilteredOut) {
      includeAvailable = true;
      if (searchTerm.value.trim()) {
        const term = searchTerm.value.toLowerCase();
        if (availableCategory.value.name.toLowerCase().includes(term)) {
          availableMatchesSearch = true;
        } else {
          includeAvailable = false; // Don't include if it doesn't match search
        }
      }
    }
  }

  if (includeAvailable) {
    // Always add "Available" at the top if included
    opts.push({ isHeader: false, category: availableCategory.value });
  }

  if (expenseCategories.value.length) {
    if (
      !searchTerm.value.trim() ||
      (searchTerm.value.trim() &&
        (incomeCategories.value.length > 0 || includeAvailable))
    ) {
      opts.push({ isHeader: true, headerText: "Ausgaben" });
    }
    expenseCategories.value.forEach((cat) =>
      opts.push({ isHeader: false, category: cat })
    );
  }
  if (incomeCategories.value.length) {
    if (
      !searchTerm.value.trim() ||
      (searchTerm.value.trim() &&
        (expenseCategories.value.length > 0 || includeAvailable))
    ) {
      opts.push({ isHeader: true, headerText: "Einnahmen" });
    }
    incomeCategories.value.forEach((cat) =>
      opts.push({ isHeader: false, category: cat })
    );
  }
  return opts;
});

/**
 * Gibt die sichtbaren Optionen zurück (abhängig von dropdownOpen).
 */
const visibleOptions = computed(() => {
  if (!dropdownOpen.value) return [];
  return options.value;
});

/**
 * Gibt nur die tatsächlichen Kategorie-Optionen (keine Header) unter den sichtbaren zurück.
 */
const nonHeaderOptions = computed(() =>
  visibleOptions.value.filter((opt) => !opt.isHeader)
);

/**
 * Gibt die aktuell hervorgehobene Kategorie zurück.
 */
const highlightedOption = computed(
  () => nonHeaderOptions.value[highlightedIndex.value]?.category
);

/**
 * Behandelt Tastatureingaben (Pfeiltasten, Enter, Escape).
 */
function onKeyDown(e: KeyboardEvent) {
  if (!dropdownOpen.value && !["Escape", "Tab"].includes(e.key)) {
    toggleDropdown();
    if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
      e.preventDefault();
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      if (highlightedIndex.value < nonHeaderOptions.value.length - 1) {
        highlightedIndex.value++;
        scrollToHighlighted();
      }
      break;
    case "ArrowUp":
      e.preventDefault();
      if (highlightedIndex.value > 0) {
        highlightedIndex.value--;
        scrollToHighlighted();
      }
      break;
    case "Enter":
      e.preventDefault();
      const selectedCat = highlightedOption.value;
      if (selectedCat) selectCategory(selectedCat);
      break;
    case "Escape":
      e.preventDefault();
      closeDropdown();
      break;
  }
}

/**
 * Scrollt zur hervorgehobenen Option.
 */
function scrollToHighlighted() {
  const opt = nonHeaderOptions.value[highlightedIndex.value];
  if (opt?.category) {
    const el = document.getElementById(
      `select-category-option-${opt.category.id}`
    );
    el?.scrollIntoView({ block: "nearest" });
  }
}

/**
 * Öffnet/schließt das Dropdown.
 */
function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
  if (dropdownOpen.value) {
    highlightedIndex.value = 0;
    const currentSelectionIndex = nonHeaderOptions.value.findIndex(
      (opt) => opt.category?.id === selected.value
    );
    if (currentSelectionIndex !== -1) {
      highlightedIndex.value = currentSelectionIndex;
    }
    nextTick(() => {
      // Fokus wird durch onFocus gesetzt
      scrollToHighlighted();
    });
  }
}

/**
 * Schließt das Dropdown.
 */
function closeDropdown() {
  dropdownOpen.value = false;
  const currentCat = categoryStore.categories.find(
    (c) => c.id === selected.value
  );
  if (currentCat && searchTerm.value !== currentCat.name) {
    searchTerm.value = currentCat.name;
  } else if (!selected.value) {
    // searchTerm.value = ""; // Behalte Text
  }
}

/**
 * Schließt das Dropdown verzögert bei Fokusverlust.
 */
function onBlur(event: FocusEvent) {
  setTimeout(() => {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !relatedTarget.closest(".dropdown-container")) {
      closeDropdown();
    }
  }, 200);
}

/**
 * Markiert Text bei Fokus und öffnet ggf. Dropdown.
 */
function onFocus(event: FocusEvent) {
  const target = event.target as HTMLInputElement;
  setTimeout(() => target.select(), 0);
  if (!dropdownOpen.value) {
    toggleDropdown();
  }
}

/**
 * Wählt eine Kategorie aus.
 */
function selectCategory(cat: (typeof categoryStore.categories)[0]) {
  debugLog("[SelectCategory] selectCategory", { id: cat.id, name: cat.name });
  selected.value = cat.id;
  searchTerm.value = cat.name;
  closeDropdown();
  debugLog("[SelectCategory] after selection", { selected: selected.value });
}

/**
 * Löscht die Suche.
 */
function clearSearch() {
  searchTerm.value = "";
  selected.value = "";
  emit("update:modelValue", undefined);
  emit("select", undefined);
  inputRef.value?.focus();
  if (!dropdownOpen.value) {
    toggleDropdown();
  } else {
    highlightedIndex.value = 0;
  }
}

// Exponiert focusInput
function focusInput() {
  inputRef.value?.focus();
}
defineExpose({ focusInput });
</script>

<template>
  <div class="relative dropdown-container">
    <!-- Suchfeld -->
    <div class="relative">
      <input
        ref="inputRef"
        type="text"
        class="input input-bordered w-full pr-8"
        v-model="searchTerm"
        @input="
          dropdownOpen = true;
          highlightedIndex = 0;
        "
        @keydown="onKeyDown"
        @focus="onFocus"
        @blur="onBlur"
        placeholder="Kategorie suchen..."
        autocomplete="off"
      />
      <!-- Löschen Button -->
      <button
        type="button"
        v-if="searchTerm"
        @mousedown.prevent="clearSearch"
        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-base text-neutral/60 hover:text-error/60 btn btn-ghost btn-xs btn-circle"
        aria-label="Suche löschen"
      >
        <Icon icon="mdi:close-circle-outline" />
      </button>
      <!-- Chevron Icon entfernt -->
    </div>
    <!-- Dropdown Liste -->
    <div
      v-if="dropdownOpen"
      class="absolute z-40 w-full bg-base-100 border border-base-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg dropdown-container"
      role="listbox"
    >
      <!-- Optionen oder "Keine Ergebnisse"-Meldung -->
      <template v-if="visibleOptions.length > 0">
        <template
          v-for="option in visibleOptions"
          :key="option.isHeader ? 'header-' + option.headerText : option.category!.id"
        >
          <!-- Header (Einnahmen/Ausgaben) -->
          <div
            v-if="option.isHeader"
            class="px-3 py-1.5 font-semibold text-sm text-primary select-none sticky top-0 bg-base-200 z-10"
            role="separator"
          >
            {{ option.headerText }}
          </div>
          <!-- Kategorie Option -->
          <div
            v-else-if="option.category"
            :id="'select-category-option-' + option.category.id"
            class="px-3 py-1.5 text-sm cursor-pointer hover:bg-base-200 flex justify-between items-center"
            :class="{
              'bg-base-300':
                nonHeaderOptions.findIndex(
                  (o) => o.category?.id === option.category?.id
                ) === highlightedIndex, // Hervorhebung Tastatur
              'font-medium': option.category.id === selected, // Hervorhebung Auswahl
            }"
            @mousedown.prevent="selectCategory(option.category)"
            role="option"
            :aria-selected="option.category.id === selected"
          >
            <span>{{ option.category.name }}</span>
            <!-- Saldo Anzeige -->
            <span class="text-xs opacity-80">
              <CurrencyDisplay
                :amount="
                  calculateCategorySaldo(
                    transactionStore.transactions,
                    option.category.id,
                    currentMonthStart,
                    currentMonthEnd
                  ).saldo
                "
                :as-integer="true"
              />
            </span>
          </div>
        </template>
      </template>
      <div v-else class="px-3 py-1.5 text-sm text-base-content/60 italic">
        Keine Kategorien gefunden.
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Verhindert Autocomplete-Überlagerung */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px hsl(var(--b1)) inset !important;
  background-color: hsl(var(--b1)) !important;
  background-image: none !important;
  color: hsl(var(--bc)) !important;
}
</style>
