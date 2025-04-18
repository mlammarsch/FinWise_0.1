<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/ui/SelectAccount.vue
 * Beschreibung: Generischer Konto-Select mit Suche und Gruppierung nach Accountgruppen.
 * Komponenten-Props:
 * - modelValue?: string - Bindung für v-model (Konto-ID)
 *
 * Emits:
 * - update:modelValue - Neue Konto-ID
 * - select - Konto wurde gewählt
 */
import { ref, computed, watch, onMounted, defineExpose } from "vue";
import { useAccountStore } from "@/stores/accountStore";
import CurrencyDisplay from "./CurrencyDisplay.vue";
import { debugLog } from "@/utils/logger";
import { nextTick } from "vue";

const props = defineProps<{
  modelValue?: string;
}>();
const emit = defineEmits(["update:modelValue", "select"]);

const accountStore = useAccountStore();

const searchTerm = ref("");
const dropdownOpen = ref(false);
const highlightedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const selected = ref(props.modelValue || "");

onMounted(() => {
  if (selected.value) {
    const acc = accountStore.accounts.find((a) => a.id === selected.value);
    if (acc) {
      searchTerm.value = acc.name;
      debugLog("[SelectAccount] onMounted → set searchTerm", {
        id: acc.id,
        name: acc.name,
      });
    }
  }
});

watch(
  () => props.modelValue,
  (newVal) => {
    selected.value = newVal || "";
    const acc = accountStore.accounts.find((a) => a.id === newVal);
    if (acc && !dropdownOpen.value) {
      searchTerm.value = acc.name;
      debugLog("[SelectAccount] watch:modelValue → set searchTerm", {
        id: acc.id,
        name: acc.name,
      });
    }
  }
);

watch(selected, (newVal) => {
  debugLog("[SelectAccount] watch:selected → emit update:modelValue", {
    newVal,
  });
  emit("update:modelValue", newVal);
  emit("select", newVal);
});

interface Option {
  isHeader: boolean;
  headerText?: string;
  account?: (typeof accountStore.accounts)[0];
}

const options = computed<Option[]>(() => {
  const opts: Option[] = [];
  // Gruppierung nach Accountgruppen
  accountStore.accountGroups.forEach((group) => {
    const groupAccounts = accountStore.accounts.filter(
      (acc) => acc.accountGroupId === group.id && acc.isActive
    );
    if (groupAccounts.length) {
      opts.push({ isHeader: true, headerText: group.name });
      groupAccounts.forEach((acc) => {
        opts.push({ isHeader: false, account: acc });
      });
    }
  });
  // Ungruppierte aktive Konten
  const ungroupped = accountStore.accounts.filter(
    (acc) => !acc.accountGroupId && acc.isActive
  );
  if (ungroupped.length) {
    opts.push({ isHeader: true, headerText: "Andere Konten" });
    ungroupped.forEach((acc) => {
      opts.push({ isHeader: false, account: acc });
    });
  }
  return opts;
});

const visibleOptions = computed(() => {
  if (!dropdownOpen.value) return [];

  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase();
    return options.value.filter((opt) => {
      if (opt.isHeader) return true;
      return opt.account?.name.toLowerCase().includes(term);
    });
  }
  return options.value;
});

function onKeyDown(e: KeyboardEvent) {
  if (!dropdownOpen.value) {
    toggleDropdown();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    const nonHeaderOptions = visibleOptions.value.filter(
      (opt) => !opt.isHeader
    );
    if (highlightedIndex.value < nonHeaderOptions.length - 1) {
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
    const nonHeaderOptions = visibleOptions.value.filter(
      (opt) => !opt.isHeader
    );
    const selectedAcc = nonHeaderOptions[highlightedIndex.value]?.account;
    if (selectedAcc) selectAccount(selectedAcc);
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeDropdown();
  }
}

function scrollToHighlighted() {
  const nonHeaderOptions = visibleOptions.value.filter((opt) => !opt.isHeader);
  const opt = nonHeaderOptions[highlightedIndex.value];
  if (opt?.account) {
    const el = document.getElementById(
      `select-account-option-${opt.account.id}`
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

function selectAccount(acc: (typeof accountStore.accounts)[0]) {
  debugLog("[SelectAccount] selectAccount", { id: acc.id, name: acc.name });
  selected.value = acc.id;
  dropdownOpen.value = false;
  searchTerm.value = acc.name;
  debugLog("[SelectAccount] after selection", { selected: selected.value });
}

function clearSearch() {
  searchTerm.value = "";
  inputRef.value?.focus();
}

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
        placeholder="Konto suchen..."
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
        v-for="(option, idx) in visibleOptions"
        :key="option.isHeader ? 'header-' + idx : option.account?.id"
      >
        <div
          v-if="option.isHeader"
          class="px-2 py-1 font-bold text-sm text-primary select-none sticky top-0 bg-primary/20"
        >
          {{ option.headerText }}
        </div>
        <div
          v-else
          :id="'select-account-option-' + option.account?.id"
          class="px-2 py-1 text-sm cursor-pointer hover:bg-base-200"
          :class="{
            'bg-base-300': option.account && option.account.id === selected,
          }"
          @click="selectAccount(option.account!)"
        >
          <div class="flex justify-between items-center">
            <span>{{ option.account?.name }}</span>
            <CurrencyDisplay
              v-if="option.account"
              :amount="option.account.balance"
              :as-integer="true"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Kein zusätzlicher Style notwendig */
</style>
