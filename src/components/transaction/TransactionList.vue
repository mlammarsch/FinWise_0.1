<script setup lang="ts">
import { computed, ref } from 'vue'
import { Transaction } from '../../types'
import { useAccountStore } from '../../stores/accountStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useTagStore } from '../../stores/tagStore'
import { formatDate, formatCurrency, getAmountClass } from '../../utils/formatters'
import CurrencyDisplay from '../ui/CurrencyDisplay.vue'

const props = defineProps<{
  transactions: Transaction[]
  showAccount?: boolean
  showRunningBalance?: boolean
}>()

const emit = defineEmits(['edit', 'delete', 'view'])

// Stores
const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Suche und Filter
const searchTerm = ref('')
const filterAccountId = ref('')
const filterCategoryId = ref('')

// Sortierung
const sortField = ref('date')
const sortDirection = ref('desc')

// Gefilterte und sortierte Transaktionen
const filteredTransactions = computed(() => {
  let result = [...props.transactions]

  // Suche
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(tx =>
      tx.payee.toLowerCase().includes(term) ||
      tx.note.toLowerCase().includes(term) ||
      getAccountName(tx.accountId).toLowerCase().includes(term) ||
      (tx.categoryId && getCategoryName(tx.categoryId).toLowerCase().includes(term))
    )
  }

  // Filter nach Konto
  if (filterAccountId.value) {
    result = result.filter(tx => tx.accountId === filterAccountId.value)
  }

  // Filter nach Kategorie
  if (filterCategoryId.value) {
    result = result.filter(tx => tx.categoryId === filterCategoryId.value)
  }

  // Sortierung
  result.sort((a, b) => {
    let comparison = 0

    if (sortField.value === 'date') {
      comparison = new Date(b.date).getTime() - new Date(a.date).getTime()
    } else if (sortField.value === 'amount') {
      comparison = b.amount - a.amount
    } else if (sortField.value === 'payee') {
      comparison = a.payee.localeCompare(b.payee)
    } else if (sortField.value === 'category') {
      const catA = a.categoryId ? getCategoryName(a.categoryId) : ''
      const catB = b.categoryId ? getCategoryName(b.categoryId) : ''
      comparison = catA.localeCompare(catB)
    } else if (sortField.value === 'account') {
      comparison = getAccountName(a.accountId).localeCompare(getAccountName(b.accountId))
    }

    return sortDirection.value === 'asc' ? comparison * -1 : comparison
  })

  return result
})

// Paginierte Transaktionen
const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTransactions.value.slice(start, end)
})

// Gesamtanzahl der Seiten
const totalPages = computed(() => {
  return Math.ceil(filteredTransactions.value.length / itemsPerPage.value)
})

// Hilfsfunktionen
function getAccountName(accountId: string): string {
  return accountStore.getAccountById(accountId)?.name || 'Unbekanntes Konto'
}

function getCategoryName(categoryId: string): string {
  return categoryStore.getCategoryById(categoryId)?.name || 'Keine Kategorie'
}

// Sortierung ändern
function changeSort(field: string) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
}

// Pagination
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Konten für den Filter
const accounts = computed(() => {
  const activeAccounts = accountStore.activeAccounts || []
  return activeAccounts.map(account => ({
    id: account.id,
    name: account.name
  }))
})

// Kategorien für den Filter
const categories = computed(() => {
  const activeCategories = categoryStore.activeCategories || []
  return activeCategories.map(category => ({
    id: category.id,
    name: category.name
  }))
})

// Zurücksetzen der Filter
function resetFilters() {
  searchTerm.value = ''
  filterAccountId.value = ''
  filterCategoryId.value = ''
  currentPage.value = 1
}
</script>

<template>
  <div>
    <!-- Filter und Suche -->
    <div class="mb-4 bg-base-200 p-4 rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Suche</span>
          </label>
          <input
            type="text"
            v-model="searchTerm"
            class="input input-bordered"
            placeholder="Suche nach Empfänger, Notiz, etc."
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Konto</span>
          </label>
          <select v-model="filterAccountId" class="select select-bordered w-full">
            <option value="">Alle Konten</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.name }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Kategorie</span>
          </label>
          <select v-model="filterCategoryId" class="select select-bordered w-full">
            <option value="">Alle Kategorien</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex justify-end mt-2">
        <button class="btn btn-sm" @click="resetFilters">Filter zurücksetzen</button>
      </div>
    </div>

    <!-- Transaktionsliste -->
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th @click="changeSort('date')" class="cursor-pointer">
              Datum
              <span v-if="sortField === 'date'" class="iconify" :data-icon="sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"></span>
            </th>
            <th v-if="showAccount" @click="changeSort('account')" class="cursor-pointer">
              Konto
              <span v-if="sortField === 'account'" class="iconify" :data-icon="sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"></span>
            </th>
            <th @click="changeSort('payee')" class="cursor-pointer">
              Empfänger/Auftraggeber
              <span v-if="sortField === 'payee'" class="iconify" :data-icon="sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"></span>
            </th>
            <th @click="changeSort('category')" class="cursor-pointer">
              Kategorie
              <span v-if="sortField === 'category'" class="iconify" :data-icon="sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"></span>
            </th>
            <th>Tags</th>
            <th @click="changeSort('amount')" class="cursor-pointer text-right">
              Betrag
              <span v-if="sortField === 'amount'" class="iconify" :data-icon="sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"></span>
            </th>
            <th v-if="showRunningBalance" class="text-right">Saldo</th>
            <th class="text-right">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in paginatedTransactions" :key="tx.id" :class="{ 'opacity-60': tx.isReconciliation }">
            <td>
              {{ formatDate(tx.date) }}
              <div class="flex flex-wrap gap-1 mt-1">
                <div v-if="tx.categoryId" class="badge badge-soft badge-secondary">{{ getCategoryName(tx.categoryId) }}</div>
              </div>
            </td>
            <td v-if="showAccount">{{ getAccountName(tx.accountId) }}</td>
            <td>
              <div class="flex flex-col">
                <span>{{ tx.payee }}</span>
                <span v-if="tx.note" class="text-xs text-base-content/60">{{ tx.note }}</span>
              </div>
            </td>
            <td></td>
            <td>
              <div class="flex flex-wrap gap-1">
                <div v-for="tagId in tx.tagIds" :key="tagId" class="badge badge-sm badge-outline">
                  {{ tagStore.getTagById(tagId)?.name }}
                </div>
              </div>
            </td>
            <td class="text-right">
              <CurrencyDisplay :amount="tx.amount" :show-zero="true" />
            </td>
            <td v-if="showRunningBalance" class="text-right">
              <CurrencyDisplay :amount="tx.runningBalance" :show-zero="true" />
            </td>
            <td class="text-right">
              <div class="flex justify-end space-x-1">
                <button class="btn btn-ghost btn-xs" @click="$emit('view', tx)">
                  <span class="iconify" data-icon="mdi:eye"></span>
                </button>
                <button class="btn btn-ghost btn-xs" @click="$emit('edit', tx)">
                  <span class="iconify" data-icon="mdi:pencil"></span>
                </button>
                <button class="btn btn-ghost btn-xs text-error" @click="$emit('delete', tx)">
                  <span class="iconify" data-icon="mdi:trash-can"></span>
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="paginatedTransactions.length === 0">
            <td :colspan="showAccount ? 8 : 7" class="text-center py-4">
              Keine Transaktionen gefunden.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center mt-4">
      <div class="btn-group">
        <button
          class="btn btn-sm"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          <span class="iconify" data-icon="mdi:chevron-left"></span>
        </button>

        <button
          v-for="page in totalPages"
          :key="page"
          class="btn btn-sm"
          :class="{ 'btn-active': page === currentPage }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <button
          class="btn btn-sm"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <span class="iconify" data-icon="mdi:chevron-right"></span>
        </button>
      </div>
    </div>
  </div>
</template>
