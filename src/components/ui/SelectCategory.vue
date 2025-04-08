<!-- Datei: src/components/ui/SelectCategory.vue (vollständig) -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/ui/SelectCategory.vue
 * Beschreibung: Generischer Kategorie-Select mit Volltextsuche.
 * Props:
 * - modelValue?: string - Bindung für v-model (Kategorie-ID)
 * - filterOutArray?: string[] - Auszuschließende Kategorie-IDs
 *
 * Emits:
 * - update:modelValue - Neue Kategorie-ID
 * - select - Kategorie wurde gewählt
 */
import { ref, computed, watch, onMounted, nextTick, defineExpose } from "vue";
import { useCategoryStore } from "@/stores/categoryStore";
import CurrencyDisplay from "./CurrencyDisplay.vue";
import { debugLog } from "@/utils/logger";
import { useTransactionStore } from "@/stores/transactionStore";
import { calculateCategorySaldo } from "@/utils/runningBalances";

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

watch(
  () => props.modelValue,
  (newVal) => {
    selected.value = newVal || "";
    const cat = categoryStore.categories.find((c) => c.id === newVal);
    if (cat && !dropdownOpen.value) {
      searchTerm.value = cat.name;
      debugLog("[SelectCategory] watch:modelValue → set searchTerm", {
        id: cat.id,
        name: cat.name,
      });
    }
  }
);

watch(selected, (newVal) => {
  debugLog("[SelectCategory] watch:selected → emit update:modelValue", {
    newVal,
  });
  emit("update:modelValue", newVal);
  emit("select", newVal);
});

const availableCategory = computed(() =>
  categoryStore.getAvailableFundsCategory()
);

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

const options = computed<Option[]>(() => {
  const opts: Option[] = [];
  if (availableCategory.value) {
    opts.push({ isHeader: false, category: availableCategory.value });
  }
  if (expenseCategories.value.length) {
    opts.push({ isHeader: true, headerText: "Ausgaben" });
    expenseCategories.value.forEach((cat) =>
      opts.push({ isHeader: false, category: cat })
    );
  }
  if (incomeCategories.value.length) {
    opts.push({ isHeader: true, headerText: "Einnahmen" });
    incomeCategories.value.forEach((cat) =>
      opts.push({ isHeader: false, category: cat })
    );
  }
  return opts;
});

const visibleOptions = computed(() => {
  if (!dropdownOpen.value) return [];

  const nonHeaderOptions = options.value.filter((opt) => !opt.isHeader);
  return nonHeaderOptions;
});

// Berechne aktuellen Monat anhand der Systemzeit
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

function onKeyDown(e: KeyboardEvent) {
  if (!dropdownOpen.value) {
    toggleDropdown();
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (highlightedIndex.value < visibleOptions.value.length - 1) {
      highlightedIndex.value++;
      scrollToHighlighted();
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (highlightedIndex.value > 0) {
      highlightedIndex.value--;
      scrollToHighlighted();
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    const selectedCat = visibleOptions.value[highlightedIndex.value]?.category;
    if (selectedCat) selectCategory(selectedCat);
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeDropdown();
  }
}

function scrollToHighlighted() {
  const opt = visibleOptions.value[highlightedIndex.value];
  if (opt?.category) {
    const el = document.getElementById(
      `select-category-option-${opt.category.id}`
    );
    el?.scrollIntoView({ block: "nearest" });
  }
}

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
  if (dropdownOpen.value) {
    highlightedIndex.value = 0;
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus();
        inputRef.value.select();
      }
    });
  }
}

function closeDropdown() {
  dropdownOpen.value = false;
}

function onBlur(event: FocusEvent) {
  // Verzögerung, um Klicks auf die Dropdown-Optionen zu erlauben
  setTimeout(() => {
    if (
      !event.relatedTarget ||
      !event.relatedTarget.closest(".dropdown-container")
    ) {
      closeDropdown();
    }
  }, 200);
}

function onFocus(event: FocusEvent) {
  const target = event.target as HTMLInputElement;
  setTimeout(() => target.select(), 0);
}

function selectCategory(cat: (typeof categoryStore.categories)[0]) {
  debugLog("[SelectCategory] selectCategory", { id: cat.id, name: cat.name });
  selected.value = cat.id;
  dropdownOpen.value = false;
  searchTerm.value = cat.name;
  debugLog("[SelectCategory] after selection", { selected: selected.value });
}

function clearSearch() {
  searchTerm.value = "";
  inputRef.value?.focus();
}

// Fokusfunktion für Modal
function focusInput() {
  inputRef.value?.focus();
}
defineExpose({ focusInput });
</script>

<template>
  <div class="relative dropdown-container">
    <div class="relative">
      <input
        ref="inputRef"
        type="text"
        class="input input-bordered w-full pr-8"
        v-model="searchTerm"
        @click="toggleDropdown"
        @keydown="onKeyDown"
        @focus="onFocus"
        @blur="onBlur"
        placeholder="Kategorie suchen..."
      />
      <!-- X Icon im Feld -->
      <button
        v-if="searchTerm"
        @click="clearSearch"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-base text-neutral/60 hover:text-error/60"
      >
        <Icon icon="mdi:close-circle-outline" />
      </button>
    </div>
    <div
      v-if="dropdownOpen"
      class="absolute z-40 w-full bg-base-100 border border-base-300 rounded-lg mt-1 max-h-60 overflow-y-auto dropdown-container"
    >
      <template
        v-for="(option, idx) in options"
        :key="option.isHeader ? 'header-' + idx : option.category!.id"
      >
        <div
          v-if="option.isHeader"
          class="px-2 py-1 font-bold text-sm text-primary select-none sticky top-0 bg-primary/20"
        >
          {{ option.headerText }}
        </div>
        <div
          v-else
          :id="'select-category-option-' + option.category!.id"
          class="px-2 py-1 text-sm cursor-pointer hover:bg-base-200"
          :class="{
            'bg-base-300': visibleOptions.indexOf(option) === highlightedIndex,
          }"
          @click="selectCategory(option.category!)"
        >
          <div class="flex justify-between items-center">
            <span>{{ option.category!.name }}</span>
            <span>
              <CurrencyDisplay
                :amount="calculateCategorySaldo(transactionStore.transactions, option.category!.id, currentMonthStart, currentMonthEnd).saldo"
                :as-integer="true"
              />
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped></style>
