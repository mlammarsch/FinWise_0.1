<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAccountStore } from '../../stores/accountStore'
import AccountForm from '../../components/account/AccountForm.vue'
import { Account, AccountType } from '../../types'

// Stores
const accountStore = useAccountStore()

// State für Modals
const showAccountModal = ref(false)

// Ausgewähltes Konto
const selectedAccount = ref<Account | null>(null)

// Bearbeitungsmodus
const isEditMode = ref(false)

// Alle Konten
const accounts = computed(() => {
  return accountStore.accounts
})

// Kontogruppen
const accountGroups = computed(() => {
  return accountStore.accountGroups
})

// Konto bearbeiten
const editAccount = (account: Account) => {
  selectedAccount.value = account
  isEditMode.value = true
  showAccountModal.value = true
}

// Neues Konto erstellen
const createAccount = () => {
  selectedAccount.value = null
  isEditMode.value = false
  showAccountModal.value = true
}

// Konto speichern
const saveAccount = (accountData: Omit<Account, 'id'>) => {
  if (isEditMode.value && selectedAccount.value) {
    accountStore.updateAccount(selectedAccount.value.id, accountData)
  } else {
    accountStore.addAccount(accountData)
  }
  
  showAccountModal.value = false
}

// Konto löschen
const deleteAccount = (account: Account) => {
  if (confirm(`Möchten Sie das Konto "${account.name}" wirklich löschen?`)) {
    accountStore.deleteAccount(account.id)
  }
}

// Kontogruppe erstellen
const createAccountGroup = () => {
  const name = prompt('Name der neuen Kontogruppe:')
  if (name) {
    accountStore.addAccountGroup({
      name,
      sortOrder: accountGroups.value.length
    })
  }
}

// Kontogruppe löschen
const deleteAccountGroup = (groupId: string) => {
  const group = accountGroups.value.find(g => g.id === groupId)
  if (!group) return
  
  if (confirm(`Möchten Sie die Kontogruppe "${group.name}" wirklich löschen?`)) {
    const result = accountStore.deleteAccountGroup(groupId)
    if (!result) {
      alert('Die Kontogruppe kann nicht gelöscht werden, da sie noch Konten enthält.')
    }
  }
}

// Formatiere den Kontotyp für die Anzeige
const formatAccountType = (type: AccountType): string => {
  switch (type) {
    case AccountType.CHECKING: return 'Girokonto'
    case AccountType.SAVINGS: return 'Sparkonto'
    case AccountType.CREDIT: return 'Kreditkarte'
    case AccountType.CASH: return 'Bargeld'
    default: return 'Unbekannt'
  }
}

// Hole den Namen einer Kontogruppe
const getGroupName = (groupId: string): string => {
  const group = accountGroups.value.find(g => g.id === groupId)
  return group ? group.name : 'Unbekannt'
}
</script>

<template>
  <div>
    <!-- Header mit Aktionen -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Konten verwalten</h2>
      
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="createAccount">
          <span class="iconify mr-2" data-icon="mdi:plus"></span>
          Neues Konto
        </button>
        <button class="btn btn-outline" @click="createAccountGroup">
          <span class="iconify mr-2" data-icon="mdi:folder-plus"></span>
          Neue Gruppe
        </button>
      </div>
    </div>
    
    <!-- Konten -->
    <div class="card bg-base-100 shadow-md mb-6">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Konten</h3>
        
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Gruppe</th>
                <th>Typ</th>
                <th>Kontostand</th>
                <th>Status</th>
                <th class="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="account in accounts" :key="account.id">
                <td>{{ account.name }}</td>
                <td>{{ getGroupName(account.accountGroupId) }}</td>
                <td>{{ formatAccountType(account.accountType) }}</td>
                <td :class="account.balance >= 0 ? 'text-success' : 'text-error'">
                  {{ new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(account.balance) }}
                </td>
                <td>
                  <div class="badge" :class="account.isActive ? 'badge-success' : 'badge-error'">
                    {{ account.isActive ? 'Aktiv' : 'Inaktiv' }}
                  </div>
                </td>
                <td class="text-right">
                  <div class="flex justify-end space-x-1">
                    <button class="btn btn-ghost btn-xs" @click="editAccount(account)">
                      <span class="iconify" data-icon="mdi:pencil"></span>
                    </button>
                    <button class="btn btn-ghost btn-xs text-error" @click="deleteAccount(account)">
                      <span class="iconify" data-icon="mdi:trash-can"></span>
                    </button>
                  </div>
                </td>
              </tr>
              
              <tr v-if="accounts.length === 0">
                <td colspan="6" class="text-center py-4">
                  Keine Konten vorhanden
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Kontogruppen -->
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Kontogruppen</h3>
        
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Sortierung</th>
                <th>Anzahl Konten</th>
                <th class="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in accountGroups" :key="group.id">
                <td>{{ group.name }}</td>
                <td>{{ group.sortOrder }}</td>
                <td>{{ accounts.filter(a => a.accountGroupId === group.id).length }}</td>
                <td class="text-right">
                  <button class="btn btn-ghost btn-xs text-error" @click="deleteAccountGroup(group.id)">
                    <span class="iconify" data-icon="mdi:trash-can"></span>
                  </button>
                </td>
              </tr>
              
              <tr v-if="accountGroups.length === 0">
                <td colspan="4" class="text-center py-4">
                  Keine Kontogruppen vorhanden
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Konto-Modal -->
    <div v-if="showAccountModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">
          {{ isEditMode ? 'Konto bearbeiten' : 'Neues Konto' }}
        </h3>
        
        <AccountForm 
          :account="selectedAccount || undefined" 
          :is-edit="isEditMode"
          @save="saveAccount" 
          @cancel="showAccountModal = false"
        />
      </div>
      <div class="modal-backdrop" @click="showAccountModal = false"></div>
    </div>
  </div>
</template>
