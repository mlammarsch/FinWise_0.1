<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PlanningTransaction, RecurrencePattern } from '../../types'
import { useAccountStore } from '../../stores/accountStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useTagStore } from '../../stores/tagStore'
import dayjs from 'dayjs'

const props = defineProps<{
  transaction?: PlanningTransaction
  isEdit?: boolean
}>()

const emit = defineEmits(['save', 'cancel'])

// Stores
const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// Formularfelder
const payee = ref('')
const note = ref('')
const amount = ref(0)
const date = ref(dayjs().format('YYYY-MM-DD'))
const accountId = ref('')
const categoryId = ref<string | null>(null)
const tagIds = ref<string[]>([])
const recurrencePattern = ref<RecurrencePattern>(RecurrencePattern.MONTHLY)
const endDate = ref<string | null>(null)
const isTransfer = ref(false)
const toAccountId = ref('')

// Lade die Daten, wenn eine Transaktion zum Bearbeiten übergeben wurde
onMounted(() => {
  if (props.transaction) {
    payee.value = props.transaction.payee
    note.value = props.transaction.note
    amount.value = props.transaction.amount
    date.value = props.transaction.startDate
    accountId.value = props.transaction.accountId
    categoryId.value = props.transaction.categoryId
    tagIds.value = props.transaction.tagIds
    recurrencePattern.value = props.transaction.recurrencePattern
    endDate.value = props.transaction.endDate
    
    // Prüfe, ob es sich um eine Überweisung handelt
    if (props.transaction.counterPlanningTransactionId) {
      isTransfer.value = true
      // Hier müsste die Gegentransaktion geladen werden, um das Zielkonto zu setzen
    }
  } else {
    // Setze Standardwerte für eine neue Transaktion
    if (accountStore.activeAccounts.length > 0) {
      accountId.value = accountStore.activeAccounts[0].id
    }
  }
})

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

// Speichere die Transaktion
const saveTransaction = () => {
  const transactionData: Omit<PlanningTransaction, 'id' | 'counterPlanningTransactionId'> = {
    payee: payee.value,
    note: note.value,
    amount: amount.value,
    startDate: date.value,
    accountId: accountId.value,
    categoryId: categoryId.value,
    tagIds: tagIds.value,
    recurrencePattern: recurrencePattern.value,
    endDate: endDate.value
  }
  
  emit('save', transactionData)
}

// Konten für das Dropdown
const accounts = computed(() => {
  return accountStore.activeAccounts
})

// Kategorien für das Dropdown
const categories = computed(() => {
  return categoryStore.activeCategories
})

// Tags für die Auswahl
const tags = computed(() => {
  return tagStore.tags
})

// Wiederholungsmuster für das Dropdown
const recurrencePatterns = [
  { value: RecurrencePattern.ONCE, label: 'Einmalig' },
  { value: RecurrencePattern.DAILY, label: 'Täglich' },
  { value: RecurrencePattern.WEEKLY, label: 'Wöchentlich' },
  { value: RecurrencePattern.BIWEEKLY, label: 'Alle 2 Wochen' },
  { value: RecurrencePattern.MONTHLY, label: 'Monatlich' },
  { value: RecurrencePattern.QUARTERLY, label: 'Vierteljährlich' },
  { value: RecurrencePattern.YEARLY, label: 'Jährlich' }
]

// Umschalten zwischen Ausgabe und Einnahme
const toggleAmountType = () => {
  amount.value = -amount.value
}

// Prüfe, ob es sich um eine Einnahme handelt
const isIncome = computed(() => {
  return amount.value > 0
})
</script>

<template>
  <form @submit.prevent="saveTransaction" class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Empfänger/Auftraggeber</span>
          <span class="text-error">*</span>
        </label>
        <input 
          type="text" 
          v-model="payee" 
          class="input input-bordered" 
          required
          placeholder="Name des Empfängers/Auftraggebers"
        />
      </div>
      
      <div class="form-control">
        <label class="label">
          <span class="label-text">Betrag</span>
          <span class="text-error">*</span>
        </label>
        <div class="input-group">
          <button 
            type="button" 
            class="btn" 
            :class="isIncome ? 'btn-success' : 'btn-error'"
            @click="toggleAmountType"
          >
            {{ isIncome ? '+' : '-' }}
          </button>
          <input 
            type="text" 
            :value="formatNumber(Math.abs(amount))" 
            @input="amount = (isIncome ? 1 : -1) * parseNumber(($event.target as HTMLInputElement).value)" 
            class="input input-bordered w-full" 
            required
            placeholder="0,00"
          />
          <span>€</span>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Konto</span>
          <span class="text-error">*</span>
        </label>
        <select v-model="accountId" class="select select-bordered w-full" required>
          <option v-for="account in accounts" :key="account.id" :value="account.id">
            {{ account.name }}
          </option>
        </select>
      </div>
      
      <div class="form-control">
        <label class="label">
          <span class="label-text">Kategorie</span>
        </label>
        <select v-model="categoryId" class="select select-bordered w-full">
          <option :value="null">Keine Kategorie</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Startdatum</span>
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
          <span class="label-text">Wiederholung</span>
          <span class="text-error">*</span>
        </label>
        <select v-model="recurrencePattern" class="select select-bordered w-full" required>
          <option v-for="pattern in recurrencePatterns" :key="pattern.value" :value="pattern.value">
            {{ pattern.label }}
          </option>
        </select>
      </div>
    </div>
    
    <div v-if="recurrencePattern !== 'ONCE'" class="form-control">
      <label class="label">
        <span class="label-text">Enddatum (optional)</span>
      </label>
      <input 
        type="date" 
        v-model="endDate" 
        class="input input-bordered" 
        :min="date"
      />
    </div>
    
    <div class="form-control">
      <label class="label">
        <span class="label-text">Tags</span>
      </label>
      <div class="flex flex-wrap gap-2 p-2 border rounded-lg">
        <div v-for="tag in tags" :key="tag.id" class="form-control">
          <label class="label cursor-pointer">
            <input 
              type="checkbox" 
              :value="tag.id" 
              v-model="tagIds" 
              class="checkbox checkbox-sm checkbox-primary mr-2" 
            />
            <span class="label-text">{{ tag.name }}</span>
          </label>
        </div>
        <div v-if="tags.length === 0" class="text-sm italic p-2">
          Keine Tags verfügbar
        </div>
      </div>
    </div>
    
    <div class="form-control">
      <label class="label">
        <span class="label-text">Notizen</span>
      </label>
      <textarea 
        v-model="note" 
        class="textarea textarea-bordered h-24" 
        placeholder="Zusätzliche Informationen"
      ></textarea>
    </div>
    
    <div class="flex justify-end space-x-2 pt-4">
      <button type="button" class="btn" @click="$emit('cancel')">Abbrechen</button>
      <button type="submit" class="btn btn-primary">Speichern</button>
    </div>
  </form>
</template>
