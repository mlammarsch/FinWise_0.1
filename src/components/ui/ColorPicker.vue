<script setup>
import { ref } from 'vue'

const emit = defineEmits(['cancel', 'farbe-intensity'])

const selected = ref(null)

// statisch definierte Klasse: Tailwind rendert sie sicher!
const colorClasses = [
  'bg-slate-400', 'bg-slate-500', 'bg-slate-600', 'bg-slate-700', 'bg-slate-800', 'bg-slate-900',
  'bg-gray-400', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900',
  'bg-red-400', 'bg-red-500', 'bg-red-600', 'bg-red-700', 'bg-red-800', 'bg-red-900',
  'bg-orange-400', 'bg-orange-500', 'bg-orange-600', 'bg-orange-700', 'bg-orange-800', 'bg-orange-900',
  'bg-yellow-400', 'bg-yellow-500', 'bg-yellow-600', 'bg-yellow-700', 'bg-yellow-800', 'bg-yellow-900',
  'bg-green-400', 'bg-green-500', 'bg-green-600', 'bg-green-700', 'bg-green-800', 'bg-green-900',
  'bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800', 'bg-blue-900',
  'bg-purple-400', 'bg-purple-500', 'bg-purple-600', 'bg-purple-700', 'bg-purple-800', 'bg-purple-900',
  'bg-pink-400', 'bg-pink-500', 'bg-pink-600', 'bg-pink-700', 'bg-pink-800', 'bg-pink-900',
  'bg-rose-400', 'bg-rose-500', 'bg-rose-600', 'bg-rose-700', 'bg-rose-800', 'bg-rose-900',
]
</script>

<template>
  <div class="card w-fit bg-base-100 shadow-xl p-4">
    <div class="grid grid-cols-6 gap-0" style="width: 210px; height: 300px; overflow-y: auto;">
      <div
        v-for="bgClass in colorClasses"
        :key="bgClass"
        class="w-6 h-6 rounded cursor-pointer border border-base-300"
        :class="[bgClass]"
        @click="selected = bgClass"
        :style="selected === bgClass ? 'outline: 2px solid white; outline-offset: 1px;' : ''"
      />
    </div>

    <div class="flex justify-end gap-2 mt-4">
      <button class="btn btn-sm btn-ghost" @click="$emit('cancel')">Abbrechen</button>
      <button class="btn btn-sm btn-primary" :disabled="!selected" @click="$emit('farbe-intensity', bgClassToValue(selected))">OK</button>
    </div>
  </div>
</template>

<script>
// Hilfsfunktion optional: extrahiere z. B. "red-500" aus "bg-red-500"
function bgClassToValue(fullClass) {
  return fullClass.replace(/^bg-/, '')
}
</script>
