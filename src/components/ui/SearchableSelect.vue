### Änderungen gegenüber letzter Variante: - Hinzugefügt: Beschreibungskommentar
für die Komponente gemäß Coderegeln. - Verbesserung: Struktur der Datei
beibehalten, aber besser lesbare Abschnitte geschaffen. - Kleinere Optimierungen
in der Lesbarkeit des Codes. ```vue /** * Pfad zur Komponente:
src/components/ui/SearchableSelect.vue * * Suchbare und auswählbare
Dropdown-Komponente. * * Komponenten-Props: * - modelValue: string | string[] -
Der aktuell ausgewählte Wert oder Werte. * - options: Array<{ id: string, name:
string }> - Verfügbare Auswahloptionen. * - label?: string - Optional:
Beschriftung des Dropdowns. * - placeholder?: string - Optional:
Platzhaltertext, wenn keine Auswahl getroffen wurde. * - multiple?: boolean -
Optional: Ermöglicht Mehrfachauswahl. * - allowCreate?: boolean - Optional:
Erlaubt das Erstellen neuer Optionen. * - required?: boolean - Optional:
Markiert das Feld als erforderlich. * - disabled?: boolean - Optional:
Deaktiviert die Auswahl. * * Emits: * - update:modelValue - Wird ausgelöst, wenn
eine Auswahl geändert wird. * - create - Wird ausgelöst, wenn eine neue Option
erstellt wird. */

<script setup lang="ts">
import { ref, computed, watch } from "vue";

const props = defineProps<{
  modelValue: string | string[];
  options: Array<{ id: string; name: string }>;
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  allowCreate?: boolean;
  required?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits(["update:modelValue", "create"]);

const searchTerm = ref("");
const isOpen = ref(false);

// Berechne die gefilterten Optionen basierend auf dem Suchbegriff
const filteredOptions = computed(() => {
  if (!searchTerm.value) return props.options;
  const term = searchTerm.value.toLowerCase();
  return props.options.filter((option) =>
    option.name.toLowerCase().includes(term)
  );
});

// Prüfe, ob eine Option ausgewählt ist
const isSelected = (id: string) => {
  return props.multiple
    ? (props.modelValue as string[]).includes(id)
    : props.modelValue === id;
};

// Wähle eine Option aus oder entferne sie
const toggleOption = (id: string) => {
  if (props.disabled) return;

  if (props.multiple) {
    const currentValue = [...(props.modelValue as string[])];
    const index = currentValue.indexOf(id);

    index === -1 ? currentValue.push(id) : currentValue.splice(index, 1);
    emit("update:modelValue", currentValue);
  } else {
    emit("update:modelValue", id);
    isOpen.value = false;
  }

  searchTerm.value = "";
};

// Erstelle eine neue Option
const createOption = () => {
  if (!searchTerm.value.trim() || !props.allowCreate) return;
  emit("create", searchTerm.value.trim());
  searchTerm.value = "";
};

// Zeige den Namen der ausgewählten Option(en) an
const selectedDisplay = computed(() => {
  if (props.multiple) {
    const selectedOptions = props.options.filter((option) =>
      (props.modelValue as string[]).includes(option.id)
    );

    if (selectedOptions.length === 0) return "";
    if (selectedOptions.length === 1) return selectedOptions[0].name;
    return `${selectedOptions.length} ausgewählt`;
  } else {
    return (
      props.options.find((option) => option.id === props.modelValue)?.name || ""
    );
  }
});

// Schließe das Dropdown, wenn außerhalb geklickt wird
const closeDropdown = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".custom-select")) {
    isOpen.value = false;
  }
};

// Füge den Event-Listener hinzu, wenn die Komponente gemountet wird
watch(isOpen, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      window.addEventListener("click", closeDropdown);
    }, 0);
  } else {
    window.removeEventListener("click", closeDropdown);
  }
});
</script>

<template>
  <div class="form-control w-full custom-select">
    <!-- Label für das Dropdown -->
    <label v-if="label" class="label">
      <span class="label-text">{{ label }}</span>
      <span v-if="required" class="text-error">*</span>
    </label>

    <div class="relative">
      <!-- Hauptbereich der Auswahl -->
      <div
        class="input input-bordered w-full flex items-center justify-between cursor-pointer"
        :class="{ 'opacity-70': disabled }"
        @click="isOpen = !disabled && !isOpen"
      >
        <span v-if="selectedDisplay" class="truncate">{{
          selectedDisplay
        }}</span>
        <span v-else class="text-base-content/50">{{
          placeholder || "Auswählen..."
        }}</span>
        <span class="iconify" data-icon="mdi:chevron-down"></span>
      </div>

      <!-- Dropdown mit Optionen -->
      <div
        v-if="isOpen"
        class="absolute z-30 mt-1 w-full bg-base-100 rounded-box shadow-lg border border-base-300"
      >
        <!-- Suchfeld -->
        <div class="p-2">
          <input
            type="text"
            class="input input-sm input-bordered w-full"
            v-model="searchTerm"
            placeholder="Suchen..."
            @click.stop
          />
        </div>

        <!-- Liste der Optionen -->
        <ul class="max-h-60 overflow-y-auto p-2">
          <li v-for="option in filteredOptions" :key="option.id" class="py-1">
            <label
              class="flex items-center space-x-2 cursor-pointer p-2 hover:bg-base-200 rounded-lg"
            >
              <input
                :type="multiple ? 'checkbox' : 'radio'"
                :checked="isSelected(option.id)"
                class="checkbox checkbox-sm"
                @change="toggleOption(option.id)"
                @click.stop
              />
              <span>{{ option.name }}</span>
            </label>
          </li>

          <!-- Keine Ergebnisse oder Option erstellen -->
          <li v-if="filteredOptions.length === 0 && searchTerm" class="py-1">
            <div
              v-if="allowCreate"
              class="p-2 hover:bg-base-200 rounded-lg cursor-pointer"
              @click="createOption"
            >
              <span class="flex items-center">
                <span class="iconify mr-2" data-icon="mdi:plus-circle"></span>
                "{{ searchTerm }}" erstellen
              </span>
            </div>
            <div v-else class="p-2 text-base-content/50">
              Keine Ergebnisse gefunden
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
```
