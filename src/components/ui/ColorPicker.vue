<!-- src/components/ui/ColorPicker.vue -->
<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  modelValue: string;
  history: string[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const picker = ref<HTMLInputElement | null>(null);

function openPicker() {
  picker.value?.click();
}

function onColorChange(e: Event) {
  emit("update:modelValue", (e.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="relative inline-block">
    <span
      class="badge badge-sm text-white cursor-pointer"
      :style="{ backgroundColor: modelValue }"
      @click="openPicker"
    >
      {{ modelValue }}
    </span>
    <input
      ref="picker"
      type="color"
      class="sr-only absolute"
      :value="modelValue"
      @input="onColorChange"
    />
    <div class="flex flex-wrap mt-2 gap-1">
      <button
        v-for="color in history"
        :key="color"
        class="w-6 h-6 rounded border border-base-300"
        :style="{ backgroundColor: color }"
        @click="$emit('update:modelValue', color)"
      />
    </div>
  </div>
</template>
