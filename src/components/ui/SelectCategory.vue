<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/ui/SelectCategory.vue
 * Kurze Beschreibung: Generischer Kategorie-Select mit Volltextsuche.
 * Komponenten-Props:
 * - initialID?: string - Vorausgewählte Kategorie-ID, falls vorhanden.
 * - filterOutArray?: string[] - Array von Kategorie-IDs, die ausgefiltert werden.
 * - modelValue?: string - Bindung für v-model.
 *
 * Emits:
 * - update:modelValue - Übermittelt die gewählte Kategorie-ID.
 * - select - Übermittelt die gewählte Kategorie-ID.
 */
import { ref, computed, onMounted, watch } from "vue";
import { useCategoryStore } from "@/stores/categoryStore";
import CurrencyDisplay from "./CurrencyDisplay.vue";

const props = defineProps<{
  initialID?: string;
  filterOutArray?: string[];
  modelValue?: string;
}>();
const emit = defineEmits(["update:modelValue", "select"]);

const categoryStore = useCategoryStore();

const searchTerm = ref("");
const dropdownOpen = ref(false);
const highlightedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

// Interner Wert: Bei Initialisierung aus initialID oder modelValue
const selected = ref(props.initialID || props.modelValue || "");

onMounted(() => {
  if (selected.value) {
    const cat = categoryStore.categories.find((c) => c.id === selected.value);
    if (cat) {
      searchTerm.value = cat.name;
    }
  }
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== undefined) {
      selected.value = newVal;
    }
  }
);

watch(selected, (newVal) => {
  emit("update:modelValue", newVal);
  emit("select", newVal);
});

// Filtere Kategorien anhand filterOutArray und Suchbegriff
const filteredCategories = computed(() => {
  let cats = categoryStore.categories;
  if (props.filterOutArray && props.filterOutArray.length > 0) {
    cats = cats.filter((cat) => !props.filterOutArray!.includes(cat.id));
  }
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase();
    cats = cats.filter((cat) => cat.name.toLowerCase().includes(term));
  }
  return cats;
});

// Gruppiere Kategorien
const availableCategory = computed(() => {
  return filteredCategories.value.find(
    (cat) => cat.name.trim().toLowerCase() === "verfügbare mittel"
  );
});

const expenseCategories = computed(() => {
  return filteredCategories.value
    .filter((cat) => {
      return (
        cat.name.trim().toLowerCase() !== "verfügbare mittel" &&
        !cat.isIncomeCategory
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
});

const incomeCategories = computed(() => {
  return filteredCategories.value
    .filter((cat) => {
      return (
        cat.isIncomeCategory &&
        cat.name.trim().toLowerCase() !== "verfügbare mittel"
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
});

interface Option {
  isHeader: boolean;
  headerText?: string;
  category?: (typeof categoryStore.categories)[0];
}

// Erstelle die Optionsliste mit Gruppierung
const options = computed<Option[]>(() => {
  const opts: Option[] = [];
  if (availableCategory.value) {
    opts.push({ isHeader: false, category: availableCategory.value });
  }
  if (expenseCategories.value.length > 0) {
    opts.push({ isHeader: true, headerText: "Ausgaben" });
    expenseCategories.value.forEach((cat) => {
      opts.push({ isHeader: false, category: cat });
    });
  }
  if (incomeCategories.value.length > 0) {
    opts.push({ isHeader: true, headerText: "Einnahmen" });
    incomeCategories.value.forEach((cat) => {
      opts.push({ isHeader: false, category: cat });
    });
  }
  return opts;
});

// Nur die auswählbaren Optionen (ohne Header)
const visibleOptions = computed(() =>
  options.value.filter((opt) => !opt.isHeader)
);

// Tastatur-Navigation
function onKeyDown(e: KeyboardEvent) {
  if (!dropdownOpen.value) {
    dropdownOpen.value = true;
    highlightedIndex.value = 0;
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightedIndex.value =
      (highlightedIndex.value + 1) % visibleOptions.value.length;
    scrollToHighlighted();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightedIndex.value =
      (highlightedIndex.value - 1 + visibleOptions.value.length) %
      visibleOptions.value.length;
    scrollToHighlighted();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (visibleOptions.value[highlightedIndex.value]?.category) {
      selectCategory(visibleOptions.value[highlightedIndex.value].category!);
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    dropdownOpen.value = false;
    searchTerm.value = "";
    inputRef.value?.focus();
  }
}

function scrollToHighlighted() {
  const currentOption = visibleOptions.value[highlightedIndex.value];
  if (currentOption?.category) {
    const el = document.getElementById(
      `select-category-option-${currentOption.category.id}`
    );
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }
}

// Öffnet das Dropdown bei Klick
function onClickInput() {
  dropdownOpen.value = true;
}

function selectCategory(cat: (typeof categoryStore.categories)[0]) {
  selected.value = cat.id;
  dropdownOpen.value = false;
  searchTerm.value = cat.name;
}
</script>

<template>
  <div class="relative">
    <input
      ref="inputRef"
      type="text"
      class="input input-bordered w-full"
      v-model="searchTerm"
      @click="onClickInput"
      @keydown="onKeyDown"
      placeholder="Kategorie suchen..."
    />
    <div
      v-if="dropdownOpen"
      class="absolute z-40 w-full bg-base-100 border border-base-300 rounded mt-1 max-h-60 overflow-y-auto"
    >
      <template
        v-for="(option, idx) in options"
        :key="option.isHeader ? 'header-' + idx : option.category!.id"
      >
        <div
          v-if="option.isHeader"
          class="px-2 py-1 font-bold select-none sticky top-0 bg-base-100"
        >
          {{ option.headerText }}
        </div>
        <div
          v-else
          :id="'select-category-option-' + option.category!.id"
          class="px-2 py-1 cursor-pointer hover:bg-base-200"
          :class="{
            'bg-base-300': visibleOptions.indexOf(option) === highlightedIndex,
          }"
          @click="selectCategory(option.category!)"
        >
          <div class="flex justify-between items-center">
            <span>{{ option.category!.name }}</span>
            <span>
              <CurrencyDisplay
                :amount="option.category!.balance"
                :as-integer="true"
              />
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Zusätzliche Styles können hier ergänzt werden */
</style>
