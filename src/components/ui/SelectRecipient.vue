<!-- src/components/planning/SelectRecipient.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/planning/SelectRecipient.vue
 * Beschreibung: Generischer Empfänger-Select mit Suche und Neuanlage.
 *
 * Komponenten-Props:
 * - modelValue?: string - Bindung für v-model (Empfänger-ID)
 *
 * Emits:
 * - update:modelValue - Neue Empfänger-ID
 * - select - Empfänger wurde gewählt
 * - create - Neuer Empfänger soll erstellt werden
 */
import { ref, computed, watch, onMounted, nextTick, defineExpose } from "vue";
import { useRecipientStore } from "@/stores/recipientStore";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  modelValue?: string;
  disabled?: boolean;
}>();
const emit = defineEmits(["update:modelValue", "select", "create"]);

const recipientStore = useRecipientStore();

const searchTerm = ref("");
const dropdownOpen = ref(false);
const highlightedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const selected = ref(props.modelValue || "");

onMounted(() => {
  if (selected.value) {
    const recipient = recipientStore.recipients.find(
      (r) => r.id === selected.value
    );
    if (recipient) {
      searchTerm.value = recipient.name;
      debugLog("[SelectRecipient] onMounted → set searchTerm", {
        id: recipient.id,
        name: recipient.name,
      });
    }
  }
});

watch(
  () => props.modelValue,
  (newVal) => {
    selected.value = newVal || "";
    const recipient = recipientStore.recipients.find((r) => r.id === newVal);
    if (recipient && !dropdownOpen.value) {
      searchTerm.value = recipient.name;
      debugLog("[SelectRecipient] watch:modelValue → set searchTerm", {
        id: recipient.id,
        name: recipient.name,
      });
    }
  }
);

watch(selected, (newVal) => {
  debugLog("[SelectRecipient] watch:selected → emit update:modelValue", {
    newVal,
  });
  emit("update:modelValue", newVal);
  emit("select", newVal);
});

const filteredRecipients = computed(() => {
  if (!dropdownOpen.value) return [];

  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase();
    return recipientStore.recipients
      .filter((r) => r.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return recipientStore.recipients.sort((a, b) => a.name.localeCompare(b.name));
});

// Bestimmt, ob ein neuer Empfänger erstellt werden kann
const canCreateRecipient = computed(() => {
  const term = searchTerm.value.trim();
  if (!term) return false;

  return !recipientStore.recipients.some(
    (r) => r.name.toLowerCase() === term.toLowerCase()
  );
});

function onKeyDown(e: KeyboardEvent) {
  if (props.disabled) return;

  if (!dropdownOpen.value) {
    toggleDropdown();
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (highlightedIndex.value < filteredRecipients.value.length - 1) {
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
    if (canCreateRecipient.value) {
      createRecipient();
    } else if (filteredRecipients.value.length > 0) {
      selectRecipient(filteredRecipients.value[highlightedIndex.value]);
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeDropdown();
  }
}

function scrollToHighlighted() {
  const option = filteredRecipients.value[highlightedIndex.value];
  if (option) {
    const el = document.getElementById(`select-recipient-option-${option.id}`);
    el?.scrollIntoView({ block: "nearest" });
  }
}

function toggleDropdown() {
  if (props.disabled) return;

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
  if (props.disabled) return;

  const target = event.target as HTMLInputElement;
  setTimeout(() => target.select(), 0);
}

function selectRecipient(recipient: { id: string; name: string }) {
  debugLog("[SelectRecipient] selectRecipient", {
    id: recipient.id,
    name: recipient.name,
  });
  selected.value = recipient.id;
  dropdownOpen.value = false;
  searchTerm.value = recipient.name;
  debugLog("[SelectRecipient] after selection", { selected: selected.value });
}

function createRecipient() {
  const name = searchTerm.value.trim();
  if (!name) return;

  emit("create", { name });
  dropdownOpen.value = false;
  debugLog("[SelectRecipient] createRecipient", { name });
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
        :disabled="disabled"
        placeholder="Empfänger suchen oder erstellen..."
      />
      <!-- X Icon im Feld -->
      <button
        v-if="searchTerm && !disabled"
        @click="clearSearch"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-base text-neutral/60 hover:text-error/60"
      >
        <Icon icon="mdi:close-circle-outline" />
      </button>
    </div>
    <div
      v-if="dropdownOpen && !disabled"
      class="absolute z-40 w-full bg-base-100 border border-base-300 rounded-lg mt-1 max-h-60 overflow-y-auto dropdown-container"
    >
      <div
        v-if="filteredRecipients.length === 0 && !canCreateRecipient"
        class="px-4 py-2 text-sm text-base-content/50"
      >
        Keine Empfänger gefunden
      </div>

      <template v-else>
        <div
          v-for="(recipient, idx) in filteredRecipients"
          :id="'select-recipient-option-' + recipient.id"
          :key="recipient.id"
          class="px-4 py-2 text-sm cursor-pointer hover:bg-base-200"
          :class="{ 'bg-base-300': idx === highlightedIndex }"
          @click="selectRecipient(recipient)"
        >
          {{ recipient.name }}
        </div>

        <div
          v-if="canCreateRecipient"
          class="px-4 py-2 text-sm cursor-pointer bg-base-200 hover:bg-base-300 flex items-center"
          @click="createRecipient"
        >
          <Icon icon="mdi:plus-circle" class="mr-2 text-lg" />
          <span>"{{ searchTerm }}" als neuen Empfänger anlegen</span>
        </div>
      </template>
    </div>
  </div>
</template>
