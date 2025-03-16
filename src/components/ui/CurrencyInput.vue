<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  label: {
    type: String,
    default: 'Betrag',
  },
});

const emit = defineEmits(['update:modelValue']);

const inputValue = ref(String(formatToGermanCurrency(props.modelValue)));

watch(() => props.modelValue, (newValue) => {
  inputValue.value = String(formatToGermanCurrency(newValue));
});

watch(inputValue, (newValue) => {
  const parsedValue = parseGermanCurrency(newValue);
  emit('update:modelValue', parsedValue);
});

function formatToGermanCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseGermanCurrency(value: string): number {
  const normalizedValue = value.replace(/\./g, '').replace(',', '.');
  const parsedValue = parseFloat(normalizedValue);
  return isNaN(parsedValue) ? 0 : parsedValue;
}

const onInput = (event: Event) => {
  let input = (event.target as HTMLInputElement).value;
  // Erlaube nur Zahlen und ein Komma
  const validInput = input.replace(/[^0-9,]/g, '');

  // Stelle sicher, dass es maximal ein Komma gibt
  const commaCount = validInput.split(',').length - 1;
  if (commaCount > 1) {
    input = inputValue.value; // Verwerfe die Eingabe
  } else {
    const parts = validInput.split(',');
    if (parts.length > 1 && parts[1].length > 2) {
      input = parts[0] + ',' + parts[1].slice(0, 2); // Beschränke auf zwei Dezimalstellen
    } else {
      input = validInput;
    }
  }
  inputValue.value = input;
};
</script>

<template>
  <div class="form-control">
    <label class="label" v-if="label">
      <span class="label-text">{{ label }}</span>
    </label>
    <input
      type="text"
      class="input input-bordered w-full"
      v-model="inputValue"
      @input="onInput"
      placeholder="z.B. 1234,56"
    />
  </div>
</template>
