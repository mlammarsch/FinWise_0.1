<script setup>
defineProps({
  label: { type: String, required: true },
  colorIntensity: { type: String, default: 'slate-700/45' }, // z. B. 'red-500/40'
})
</script>

<template>
  <div class="inline-block relative">
    <div
      class="absolute inset-0 flex items-center justify-center rounded-full text-sm font-medium pointer-events-none z-10 text-white"
      :class="`bg-[${colorIntensity}]`"
    >
      {{ label }}
    </div>

    <div class="badge text-white badge-soft opacity-80 rounded-full">
      {{ label }}
    </div>
  </div>
</template>
