<script setup lang="ts">
import { ref, computed } from 'vue'
import { Category } from '../../types'
import { useCategoryStore } from '../../stores/categoryStore'
import { formatCurrency } from '../../utils/formatters'

const props = defineProps<{
  category?: Category
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'transfer'])

const categoryStore = useCategoryStore()

// Formularfelder
const fromCategoryId = ref('')
const toCategoryId = ref('')
const amount = ref(0)
const date = ref(new Date().toISOString().split('T')[0])
const note = ref('')

// Setze die Quellkategorie, wenn eine übergeben wurde
if (props.category) {
  fromCategoryId.value = props.category.id
}

// Konvertiere einen String in eine Zahl
const parseNumber = (value: string): number => {
  // Ersetze Komma durch Punkt für die Konvertierung
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized) || 0
}

// Formatiere eine Zahl für die Anzeige
const formatNumber = (value: number): string => {
  return value.toString().replace('.', ',')
}

// Kategorien für das Dropdown (ohne die ausgewählte Quellkategorie)
const toCategories = computed(() => {
  return categoryStore.activeCategories
    .filter(cat => cat.id !== fromCategoryId.value)
    .map(cat => ({
      id: cat.id,
      name: cat.name
    }))
})

// Quellkategorien für das Dropdown
const fromCategories = computed(() => {
  return categoryStore.activeCategories.map(cat => ({
    id: cat.id,
    name: cat.name
  }))
})

// Aktueller Saldo der Quellkategorie
const fromCategoryBalance = computed(() => {
  if (!fromCategoryId.value) return 0
  const category = categoryStore.getCategoryById.value(fromCategoryId.value)
  return category ? category.balance : 0
})

// Führe die Übertragung durch
const transferBetweenCategories = () => {
  if (!fromCategoryId.value || !toCategoryId.value || amount.value <= 0) return
  
  emit('transfer', {
    fromCategoryId: fromCategoryId.value,
    toCategoryId: toCategoryId.value,
    amount: amount.value,
    date: date.value,
    note: note.value
  })
  
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Zwischen Kategorien übertragen</h3>
      
      <form @submit.prevent="transferBetweenCategories">
        <div class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Von Kategorie</span>
              <span class="text-error">*</span>
            </label>
            <select v-model="fromCategoryId" class="select select-bordered w-full" required>
              <option value="" disabled>Kategorie auswählen</option>
              <option v-for="category in fromCategories" :key="category.id" :value="category.id">
                {{ category.name }} ({{ formatCurrency(categoryStore.getCategoryById.value(category.id)?.balance || 0) }})
              </option>
            </select>
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">Zu Kategorie</span>
              <span class="text-error">*</span>
            </label>
            <select v-model="toCategoryId" class="select select-bordered w-full" required>
              <option value="" disabled>Kategorie auswählen</option>
              <option v-for="category in toCategories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">Betrag</span>
              <span class="text-error">*</span>
            </label>
            <div class="input-group">
              <input 
                type="text" 
                :value="formatNumber(amount)" 
                @input="amount = parseNumber(($event.target as HTMLInputElement).value)" 
                class="input input-bordered w-full" 
                required
                placeholder="0,00"
                :max="fromCategoryBalance"
              />
              <span>€</span>
            </div>
            <label class="label">
              <span class="label-text-alt">Verfügbar: {{ formatCurrency(fromCategoryBalance) }}</span>
            </label>
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">Datum</span>
              <span class="text-error">*</span>
            </label>
            <input 
              type="date" 
              v-model="date" 
              class="input input-bordered" 
              required
            />
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">Notiz</span>
            </label>
            <input 
              type="text" 
              v-model="note" 
              class="input input-bordered" 
              placeholder="Grund für die Übertragung"
            />
          </div>
        </div>
        
        <div class="modal-action">
          <button type="button" class="btn" @click="$emit('close')">Abbrechen</button>
          <button 
            type="submit" 
            class="btn btn-primary"
            :disabled="!fromCategoryId || !toCategoryId || amount <= 0 || amount > fromCategoryBalance"
          >
            Übertragen
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="$emit('close')"></div>
  </div>
</template>
