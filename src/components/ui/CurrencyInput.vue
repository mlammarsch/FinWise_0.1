/**
 * Pfad zur Komponente: components/AmountInput.vue
 * Eingabefeld für Währungsbeträge mit automatischer Formatierung.
 *
 * Komponenten-Props:
 * - modelValue: number - Der aktuelle Wert des Betrags
 * - label?: string - Optional: Beschriftung für das Eingabefeld
 *
 * Emits:
 * - update:modelValue - Gibt den formatierten Wert beim Blur oder Enter zurück
 */

<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  label: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);
const rawInputValue = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

// Setzt den initialen Wert basierend auf modelValue
onMounted(() => {
  rawInputValue.value =
    props.modelValue !== 0 ? formatToGermanCurrency(props.modelValue) : "";
});

// Beobachtet Änderungen an modelValue und setzt das Format, wenn das Feld nicht fokussiert ist
watch(
  () => props.modelValue,
  (newValue) => {
    if (document.activeElement !== inputRef.value) {
      rawInputValue.value = formatToGermanCurrency(newValue);
    }
  }
);

// Ermittelt die Textfarbe basierend auf dem Betrag (grün für positiv, rot für negativ)
const textClass = computed(() => {
  return props.modelValue < 0 ? "text-error" : "text-success";
});

// Parst die Eingabe und erlaubt nur gültige Zahlen mit maximal einem Komma
const parseInput = (input: string): string => {
  let validInput = input.replace(/[^0-9,]/g, "");
  const parts = validInput.split(",");

  if (parts.length > 2) {
    validInput = parts[0] + "," + parts[1]; // Mehrere Kommata verhindern
  } else if (parts.length > 1 && parts[1].length > 2) {
    validInput = parts[0] + "," + parts[1].slice(0, 2); // Maximal zwei Nachkommastellen
  }

  return validInput;
};

// Wird bei jeder Eingabe im Feld aufgerufen
const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  rawInputValue.value = parseInput(target.value);
};

// Speichert den Wert und löst das Submit-Event im Parent aus
const onEnter = (event: KeyboardEvent) => {
  formatAndEmitValue();
  event.target?.dispatchEvent(new Event("change", { bubbles: true })); // Ermöglicht das Submitten
};

// Formatiert den Betrag erst beim Verlassen des Feldes
const onBlur = () => {
  formatAndEmitValue();
};

// Funktion zur Formatierung und Speicherung des Wertes
const formatAndEmitValue = () => {
  const parsedValue = parseGermanCurrency(rawInputValue.value);
  emit("update:modelValue", parsedValue);
  rawInputValue.value = formatToGermanCurrency(parsedValue);
};

// Markiert den gesamten Inhalt beim Fokuserhalt, aber behält das deutsche Komma-Format
const onFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement;
  rawInputValue.value = rawInputValue.value; // Keine Umwandlung in Punkt-Notation

  // Kleiner Timeout für sichere Selektion
  setTimeout(() => target.select(), 0);
};

// Formatiert eine Zahl ins deutsche Währungsformat
function formatToGermanCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Konvertiert einen deutschen Währungstext zurück in eine Zahl
function parseGermanCurrency(value: string): number {
  const normalizedValue = value.replace(/\./g, "").replace(",", ".");
  const parsedValue = parseFloat(normalizedValue);
  return isNaN(parsedValue) ? 0 : parsedValue;
}
</script>

<template>
  <div class="form-control">
    <!-- Beschriftung des Eingabefelds -->
    <label class="label" v-if="label">
      <span class="label-text">{{ label }}</span>
    </label>

    <!-- Input mit €-Symbol -->
    <div class="input-group">
      <input
        ref="inputRef"
        type="text"
        class="input input-bordered w-full amount-input"
        v-model="rawInputValue"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter="onEnter"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* Stellt sicher, dass das €-Symbol nur opacity-50 bekommt */
.currency-symbol {
  opacity: 0.5;
  margin-right: 0.5rem;
}

/* Setzt die Farbwerte für die Beträge */
.amount-input {
  &.text-success {
    color: #16a34a; /* Tailwind grün-600 */
  }

  &.text-error {
    color: #dc2626; /* Tailwind rot-600 */
  }
}
</style>
