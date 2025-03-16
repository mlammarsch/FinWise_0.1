<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTransactionStore } from '../stores/transactionStore'
import { useCategoryStore } from '../stores/categoryStore'
import { useTagStore } from '../stores/tagStore'
import TransactionList from '../components/transaction/TransactionList.vue'
import TransactionDetailModal from '../components/transaction/TransactionDetailModal.vue'
import TransactionForm from '../components/transaction/TransactionForm.vue'
import { Transaction } from '../types'

// Stores
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// State für Modals
const showNewTransactionModal = ref(false)
const showTransactionDetailModal = ref(false)
const showEditTransactionModal = ref(false)

// Ausgewählte Transaktion
const selectedTransaction = ref<Transaction | null>(null)

// Alle Transaktionen
const transactions = computed(() => {
  return transactionStore.transactions
})

// Transaktion anzeigen
const viewTransaction = (transaction: Transaction) => {
  selectedTransaction.value = transaction
  showTransactionDetailModal.value = true
}

// Transaktion bearbeiten
const editTransaction = (transaction: Transaction) => {
  selectedTransaction.value = transaction
  showEditTransactionModal.value = true
  showTransactionDetailModal.value = false
}

// Neue Transaktion erstellen
const createTransaction = () => {
  selectedTransaction.value = null
  showNewTransactionModal.value = true
}

// Transaktion speichern
const saveTransaction = (data: any) => {
  if (selectedTransaction.value) {
    // Bestehende Transaktion aktualisieren
    if (data.type === 'TRANSFER') {
      // Transfers können nicht bearbeitet werden, nur gelöscht und neu erstellt
      alert('Transfers können nicht bearbeitet werden. Bitte löschen Sie den Transfer und erstellen Sie einen neuen.')
    } else {
      transactionStore.updateTransaction(selectedTransaction.value.id, data.transaction)
    }
  } else {
    // Neue Transaktion erstellen
    if (data.type === 'TRANSFER') {
      transactionStore.addTransferTransaction(
        data.fromAccountId,
        data.toAccountId,
        data.amount,
        data.date,
        data.valueDate,
        data.note
      )
    } else {
      transactionStore.addTransaction(data.transaction)
    }
  }
  
  showNewTransactionModal.value = false
  showEditTransactionModal.value = false
}

// Transaktion löschen
const deleteTransaction = (transaction: Transaction) => {
  if (confirm('Möchten Sie diese Transaktion wirklich löschen?')) {
    transactionStore.deleteTransaction(transaction.id)
    showTransactionDetailModal.value = false
  }
}

// Erstelle eine neue Kategorie
const createCategory = (name: string) => {
  const newCategory = categoryStore.addCategory({
    name,
    description: '',
    isActive: true,
    isSavingsGoal: false,
    targetAmount: 0,
    targetDate: null,
    categoryGroupId: categoryStore.categoryGroups[0]?.id || '',
    parentCategoryId: null,
    balance: 0
  })
  
  return newCategory
}

// Erstelle ein neues Tag
const createTag = (name: string) => {
  const newTag = tagStore.addTag({
    name,
    parentTagId: null
  })
  
  return newTag
}
</script>

<template>
  <div>
    <!-- Header mit Aktionen -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Transaktionen</h2>
      
      <button class="btn btn-primary" @click="createTransaction">
        <span class="iconify mr-2" data-icon="mdi:plus"></span>
        Neue Transaktion
      </button>
    </div>
    
    <!-- Transaktionsliste -->
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <TransactionList 
          :transactions="transactions" 
          :show-account="true"
          @view="viewTransaction"
          @edit="editTransaction"
          @delete="deleteTransaction"
        />
      </div>
    </div>
    
    <!-- Neue Transaktion Modal -->
    <div v-if="showNewTransactionModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Neue Transaktion</h3>
        
        <TransactionForm 
          @save="saveTransaction" 
          @cancel="showNewTransactionModal = false"
          @create-category="createCategory"
          @create-tag="createTag"
        />
      </div>
      <div class="modal-backdrop" @click="showNewTransactionModal = false"></div>
    </div>
    
    <!-- Transaktionsdetail-Modal -->
    <TransactionDetailModal 
      :transaction="selectedTransaction" 
      :is-open="showTransactionDetailModal"
      @close="showTransactionDetailModal = false"
      @edit="editTransaction"
      @delete="deleteTransaction"
    />
    
    <!-- Transaktion bearbeiten Modal -->
    <div v-if="showEditTransactionModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Transaktion bearbeiten</h3>
        
        <TransactionForm 
          :transaction="selectedTransaction || undefined" 
          :is-edit="true"
          @save="saveTransaction" 
          @cancel="showEditTransactionModal = false"
          @create-category="createCategory"
          @create-tag="createTag"
        />
      </div>
      <div class="modal-backdrop" @click="showEditTransactionModal = false"></div>
    </div>
  </div>
</template>
