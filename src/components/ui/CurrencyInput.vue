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

onMounted(() => {
  rawInputValue.value =
    props.modelValue !== 0 ? formatToGermanCurrency(props.modelValue) : "";
});

watch(
  () => props.modelValue,
  (newValue) => {
    if (document.activeElement !== inputRef.value) {
      rawInputValue.value = formatToGermanCurrency(newValue);
    }
  }
);

const textClass = computed(() => {
  return props.modelValue < 0 ? "text-error" : "text-success";
});

const parseInput = (input: string): string => {
  let validInput = input.replace(/[^0-9,-]/g, ""); // Erlaubt Zahlen, Komma und Minus
  const hasMinus = validInput.startsWith("-"); // Prüft, ob Minus vorne steht
  validInput = validInput.replace(/-/g, ""); // Entfernt alle Minuszeichen
  if (hasMinus) validInput = "-" + validInput; // Fügt Minuszeichen nur vorne hinzu

  const parts = validInput.split(",");

  if (parts.length > 2) {
    validInput = parts[0] + "," + parts[1]; // Mehrere Kommata verhindern
  } else if (parts.length > 1 && parts[1].length > 2) {
    validInput = parts[0] + "," + parts[1].slice(0, 2); // Maximal zwei Nachkommastellen
  }

  return validInput;
};

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  rawInputValue.value = parseInput(target.value);
};

const onEnter = (event: KeyboardEvent) => {
  formatAndEmitValue();
  event.target?.dispatchEvent(new Event("change", { bubbles: true }));
};

const onBlur = () => {
  formatAndEmitValue();
};

const formatAndEmitValue = () => {
  const parsedValue = parseGermanCurrency(rawInputValue.value);
  emit("update:modelValue", parsedValue);
  rawInputValue.value = formatToGermanCurrency(parsedValue);
};

const onFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement;
  setTimeout(() => target.select(), 0);
};

function formatToGermanCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseGermanCurrency(value: string): number {
  const normalizedValue = value.replace(/\./g, "").replace(",", ".");
  const parsedValue = parseFloat(normalizedValue);
  return isNaN(parsedValue) ? 0 : parsedValue;
}
</script>

<template>
  <div class="form-control">
    <label class="label" v-if="label">
      <span class="label-text">{{ label }}</span>
    </label>
    <div class="input-group">
      <input
        ref="inputRef"
        type="text"
        class="input input-bordered w-full text-right"
        v-model="rawInputValue"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter="onEnter"
      />
    </div>
  </div>
</template>
