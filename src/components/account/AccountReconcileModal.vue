<script setup lang="ts">
import { ref, computed } from 'vue'
import { Account } from '../../types'
import { useTransactionStore } from '../../stores/transactionStore'
import { formatCurrency } from '../../utils/formatters'
import DatePicker from '../ui/DatePicker.vue'

const props = defineProps<{
  account: Account
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'reconciled'])

const transactionStore = useTransactionStore()

// Formularfelder
const actualBalance = ref(props.account.balance)
const reconcileDate = ref(new Date().toISOString().split('T')[0])
const note = ref('Kontoabgleich')

// Berechne die Differenz zwischen dem aktuellen und dem eingegebenen Kontostand
const difference = computed(() => {
  return actualBalance.value - props.account.balance
})

// Formatiere die Differenz als Währung
const formattedDifference = computed(() => {
  return formatCurrency(difference.value)
})

// Bestimme die Klasse für die Differenz
const differenceClass = computed(() => {
  if (difference.value > 0) return 'text-success'
  if (difference.value < 0) return 'text-error'
  return 'text-neutral'
})

// Konvertiere einen String in eine Zahl
const parseNumber = (value: string): number => {
  // Ersetze Komma durch Punkt für die Konvertierung
  // Ersetze zuerst Punkte durch nichts, dann Komma durch Punkt
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized) || 0
}

// Formatiere eine Zahl für die Anzeige
const formatNumber = (value: number): string => {
  return value.toString().replace('.', ',')
}


// Führe den Kontoabgleich durch
const reconcileAccount = () => {
  if (difference.value === 0) {
    emit('close')
    return
  }

  const result = transactionStore.addReconciliationTransaction(
    props.account.id,
    actualBalance.value,
    reconcileDate.value,
    note.value
  )

  if (result) {
    emit('reconciled')
  }

  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Kontoabgleich: {{ account.name }}</h3>

      <form @submit.prevent="reconcileAccount">
        <div class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Aktueller Kontostand laut FinWise</span>
            </label>
            <input
              type="text"
              :value="formatCurrency(account.balance)"
              class="input input-bordered"
              disabled
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Tatsächlicher Kontostand</span>
              <span class="text-error">*</span>
            </label>
            <input
              type="text"
              :value="formatNumber(actualBalance)"
              @input="actualBalance = parseNumber(($event.target as HTMLInputElement).value)"
              class="input input-bordered"
              required
              placeholder="0,00"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Differenz</span>
            </label>
            <div class="input input-bordered flex items-center" :class="differenceClass">
              {{ formattedDifference }}
            </div>
          </div>

          <DatePicker
            v-model="reconcileDate"
            label="Datum des Abgleichs"
            required
          />

          <div class="form-control">
            <label class="label">
              <span class="label-text">Notiz</span>
            </label>
            <input
              type="text"
              v-model="note"
              class="input input-bordered"
              placeholder="Grund für den Abgleich"
            />
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn" @click="$emit('close')">Abbrechen</button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="difference === 0"
          >
            Abgleichen
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="$emit('close')"></div>
  </div>
</template>
