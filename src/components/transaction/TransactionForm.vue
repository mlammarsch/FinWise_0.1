<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Transaction, TransactionType } from '../../types'
import { useAccountStore } from '../../stores/accountStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useTagStore } from '../../stores/tagStore'
import DatePicker from '../ui/DatePicker.vue'
import SearchableSelect from '../ui/SearchableSelect.vue'

const props = defineProps<{
  transaction?: Transaction
  isEdit?: boolean
  initialAccountId?: string
  initialTransactionType?: TransactionType
}>()

const emit = defineEmits(['save', 'cancel', 'createCategory', 'createTag'])

// Stores
const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// Formularfelder
const date = ref(new Date().toISOString().split('T')[0])
const valueDate = ref('')
const transactionType = ref<TransactionType>(TransactionType.EXPENSE)
const accountId = ref('')
const toAccountId = ref('')
const categoryId = ref<string | null>(null)
const tagIds = ref<string[]>([])
const payee = ref('')
const amount = ref(0)
const note = ref('')

// Lade die Daten, wenn eine Transaktion zum Bearbeiten übergeben wurde
onMounted(() => {
  if (props.transaction) {
    date.value = props.transaction.date
    valueDate.value = props.transaction.valueDate || props.transaction.date
    accountId.value = props.transaction.accountId
    categoryId.value = props.transaction.categoryId
    tagIds.value = props.transaction.tagIds
    payee.value = props.transaction.payee
    amount.value = props.transaction.amount
    note.value = props.transaction.note
    
    // Bestimme den Transaktionstyp
    if (props.transaction.counterTransactionId) {
      transactionType.value = TransactionType.TRANSFER
      
      // Finde die Gegenbuchung, um das Zielkonto zu ermitteln
      const counterTx = transactionStore.getTransactionById.value(props.transaction.counterTransactionId)
      if (counterTx) {
        toAccountId.value = counterTx.accountId
      }
    } else if (props.transaction.amount > 0) {
      transactionType.value = TransactionType.INCOME
    } else {
      transactionType.value = TransactionType.EXPENSE
    }
  } else {
    // Setze Standardwerte für eine neue Transaktion
    if (props.initialAccountId) {
      accountId.value = props.initialAccountId
    } else if (accountStore.activeAccounts.length > 0) {
      accountId.value = accountStore.activeAccounts[0].id
    }
    
    if (props.initialTransactionType) {
      transactionType.value = props.initialTransactionType
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
  let finalAmount = Math.abs(amount.value)
  
  // Passe den Betrag basierend auf dem Transaktionstyp an
  if (transactionType.value === TransactionType.EXPENSE) {
    finalAmount = -finalAmount
  } else if (transactionType.value === TransactionType.TRANSFER) {
    // Bei Transfers wird der Betrag in der addTransferTransaction-Methode angepasst
  }
  
  if (transactionType.value === TransactionType.TRANSFER) {
    emit('save', {
      type: TransactionType.TRANSFER,
      fromAccountId: accountId.value,
      toAccountId: toAccountId.value,
      amount: finalAmount,
      date: date.value,
      valueDate: valueDate.value || date.value,
      note: note.value
    })
  } else {
    const transactionData: Omit<Transaction, 'id' | 'runningBalance' | 'counterTransactionId' | 'planningTransactionId' | 'isReconciliation'> = {
      date: date.value,
      valueDate: valueDate.value || date.value,
      accountId: accountId.value,
      categoryId: categoryId.value,
      tagIds: tagIds.value,
      payee: payee.value,
      amount: finalAmount,
      note: note.value
    }
    
    emit('save', {
      type: transactionType.value,
      transaction: transactionData
    })
  }
}

// Erstelle eine neue Kategorie
const createCategory = (name: string) => {
  emit('createCategory', name)
}

// Erstelle ein neues Tag
const createTag = (name: string) => {
  emit('createTag', name)
}

// Konten für das Dropdown
const accounts = computed(() => {
  return accountStore.activeAccounts?.map(account => ({
    id: account.id,
    name: account.name
  })) || []
})

// Zielkonten für Transfers (alle außer dem ausgewählten Konto)
const toAccounts = computed(() => {
  return accountStore.activeAccounts
    ?.filter(account => account.id !== accountId.value)
    .map(account => ({
      id: account.id,
      name: account.name
    })) || []
})

// Kategorien für das Dropdown
const categories = computed(() => {
  return categoryStore.activeCategories?.map(category => ({
    id: category.id,
    name: category.name
  })) || []
})

// Tags für das Dropdown
const tags = computed(() => {
  return tagStore.tags?.map(tag => ({
    id: tag.id,
    name: tag.name
  })) || []
})

// Transaktionstypen für das Dropdown
const transactionTypes = [
  { value: TransactionType.EXPENSE, label: 'Ausgabe' },
  { value: TransactionType.INCOME, label: 'Einnahme' },
  { value: TransactionType.TRANSFER, label: 'Überweisung' }
]

// Setze das Wertstellungsdatum auf das Buchungsdatum, wenn es leer ist
watch(date, (newDate) => {
  if (!valueDate.value) {
    valueDate.value = newDate
  }
})
</script>

<template>
  <form @submit.prevent="saveTransaction" class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DatePicker
        v-model="date"
        label="Buchungsdatum"
        required
      />
      
      <DatePicker
        v-model="valueDate"
        label="Wertstellung"
      />
    </div>
    
    <div class="form-control">
      <label class="label">
        <span class="label-text">Transaktionstyp</span>
        <span class="text-error">*</span>
      </label>
      <select v-model="transactionType" class="select select-bordered w-full" required>
        <option v-for="type in transactionTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">{{ transactionType === TransactionType.TRANSFER ? 'Von Konto' : 'Konto' }}</span>
          <span class="text-error">*</span>
        </label>
        <select v-model="accountId" class="select select-bordered w-full" required>
          <option v-for="account in accounts" :key="account.id" :value="account.id">
            {{ account.name }}
          </option>
        </select>
      </div>
      
      <div v-if="transactionType === TransactionType.TRANSFER" class="form-control">
        <label class="label">
          <span class="label-text">Auf Konto</span>
          <span class="text-error">*</span>
        </label>
        <select v-model="toAccountId" class="select select-bordered w-full" required>
          <option v-for="account in toAccounts" :key="account.id" :value="account.id">
            {{ account.name }}
          </option>
        </select>
      </div>
      
      <div v-else class="form-control">
        <label class="label">
          <span class="label-text">Kategorie</span>
        </label>
        <SearchableSelect
          v-model="categoryId"
          :options="categories"
          placeholder="Kategorie auswählen"
          allow-create
          @create="createCategory"
        />
      </div>
    </div>
    
    <div v-if="transactionType !== TransactionType.TRANSFER" class="form-control">
      <label class="label">
        <span class="label-text">Empfänger/Auftraggeber</span>
      </label>
      <input 
        type="text" 
        v-model="payee" 
        class="input input-bordered" 
        placeholder="Name des Empfängers oder Auftraggebers"
      />
    </div>
    
    <div class="form-control">
      <label class="label">
        <span class="label-text">Betrag</span>
        <span class="text-error">*</span>
      </label>
      <div class="input-group">
        <input 
          type="text" 
          :value="formatNumber(Math.abs(amount))" 
          @input="amount = parseNumber(($event.target as HTMLInputElement).value)" 
          class="input input-bordered w-full" 
          required
          placeholder="0,00"
        />
        <span>€</span>
      </div>
    </div>
    
    <div v-if="transactionType !== TransactionType.TRANSFER" class="form-control">
      <label class="label">
        <span class="label-text">Tags</span>
      </label>
      <SearchableSelect
        v-model="tagIds"
        :options="tags"
        placeholder="Tags auswählen"
        multiple
        allow-create
        @create="createTag"
      />
    </div>
    
    <div class="form-control">
      <label class="label">
        <span class="label-text">Notiz</span>
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
