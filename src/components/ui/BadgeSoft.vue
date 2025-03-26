<script setup>
defineProps({
  label: { type: String, required: true },
  colorIntensity: {
    type: String,
    default: "primary", // Nur DaisyUI Farbname: primary, success, etc.
  },
});
</script>

<template>
  <div
    class="badge badge-soft badge-sm rounded-full"
    :class="`badge-${colorIntensity}`"
  >
    {{ label }}
  </div>
</template>
