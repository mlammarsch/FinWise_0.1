<script setup lang="ts">
import { computed } from 'vue'
import { Transaction } from '../../types'
import { useAccountStore } from '../../stores/accountStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useTagStore } from '../../stores/tagStore'
import { formatDate } from '../../utils/formatters'
import CurrencyDisplay from '../ui/CurrencyDisplay.vue'

const props = defineProps<{
  transaction: Transaction | null
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'edit', 'delete'])

// Stores
const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// Hilfsfunktionen
const getAccountName = (accountId: string): string => {
  return accountStore.getAccountById.value(accountId)?.name || 'Unbekanntes Konto'
}

const getCategoryName = (categoryId: string | null): string => {
  if (!categoryId) return 'Keine Kategorie'
  return categoryStore.getCategoryById.value(categoryId)?.name || 'Unbekannte Kategorie'
}

const getTagNames = computed(() => {
  if (!props.transaction) return []

  return props.transaction.tagIds.map(id => {
    const tag = tagStore.getTagById.value(id)
    return tag ? tag.name : 'Unbekanntes Tag'
  })
})

const isTransfer = computed(() => {
  return props.transaction?.counterTransactionId !== null
})

const isReconciliation = computed(() => {
  return props.transaction?.isReconciliation
})
</script>

<template>
  <div v-if="isOpen && transaction" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Transaktionsdetails</h3>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-base-content/70">Datum</div>
            <div>{{ formatDate(transaction.date) }}</div>
          </div>

          <div>
            <div class="text-sm text-base-content/70">Wertstellung</div>
            <div>{{ formatDate(transaction.valueDate) }}</div>
          </div>
        </div>

        <div>
          <div class="text-sm text-base-content/70">Konto</div>
          <div>{{ getAccountName(transaction.accountId) }}</div>
        </div>

        <div v-if="isTransfer">
          <div class="text-sm text-base-content/70">Transaktionstyp</div>
          <div>Überweisung</div>
        </div>

        <div v-if="isReconciliation">
          <div class="text-sm text-base-content/70">Transaktionstyp</div>
          <div>Kontoabgleich</div>
        </div>

        <div v-if="!isTransfer && !isReconciliation">
          <div class="text-sm text-base-content/70">Empfänger/Auftraggeber</div>
          <div>{{ transaction.payee }}</div>
        </div>

        <div v-if="!isReconciliation">
          <div class="text-sm text-base-content/70">Kategorie</div>
          <div>{{ getCategoryName(transaction.categoryId) }}</div>
        </div>

        <div v-if="getTagNames.length > 0">
          <div class="text-sm text-base-content/70">Tags</div>
          <div class="flex flex-wrap gap-1 mt-1">
            <div v-for="(tag, index) in getTagNames" :key="index" class="badge badge-outline">
              {{ tag }}
            </div>
          </div>
        </div>

        <div>
          <div class="text-sm text-base-content/70">Betrag</div>
          <div class="text-lg font-semibold">
            <CurrencyDisplay :amount="transaction.amount" :show-zero="true" />
          </div>
        </div>

        <div v-if="transaction.note">
          <div class="text-sm text-base-content/70">Notiz</div>
          <div class="whitespace-pre-wrap">{{ transaction.note }}</div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-error btn-sm" @click="$emit('delete', transaction)">
          <span class="iconify mr-1" data-icon="mdi:trash-can"></span>
          Löschen
        </button>
        <button class="btn btn-primary btn-sm" @click="$emit('edit', transaction)">
          <span class="iconify mr-1" data-icon="mdi:pencil"></span>
          Bearbeiten
        </button>
        <button class="btn btn-sm" @click="$emit('close')">Schließen</button>
      </div>
    </div>
    <div class="modal-backdrop" @click="$emit('close')"></div>
  </div>
</template>
