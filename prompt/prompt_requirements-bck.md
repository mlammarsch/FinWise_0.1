Anforderung 1. In der src\components\planning\PlanningTransactionForm.vue, sofern ich auf Kategorientransfer umstelle (CATEGORYTRANSFER), wird beim ersten Speichern komischerweise nicht die Zielkategorie mit abgespeichert. Obwohl ich sie zuvor aber ausgewählt habe. Prüfe, was zu diesem Fehler führt.
Anforderung 2. Einige Felder sind mit Asterix (<span class="text-error">*</span>) gekennzeichnet in der Oberläche. Dies sagt aus, dass es sich um Pflichtfelder handelt. Bitte füge in die jeweiligen Formularfelder einen Validator wie hier im Musterbeispiel:
<input className="input validator" type="email" required placeholder="mail@site.com" />
<div className="validator-hint">Enter valid email address</div>
Anforderung 3. Setze die übrigen Felder Felder in eine Fieldset Klasse, wie ich es mit Empfänger bereits gemacht habe.
Hier als Beispiel der Codeauszug.:
  <!-- Empfänger -->
      <div class="form-control">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">
            Empfänger/Auftraggeber<span
              v-if="!isCategoryTransfer && !isAccountTransfer"
              class="text-error"
              >*</span
            >
          </legend>
          <SelectRecipient v-model="recipientId" @create="onCreateRecipient" />
        </fieldset>
      </div>
Bei eingebetteten Komponenten ist das schwieriger. Hier eine Anleitung, wie Du den Validator dort am besten anwendest:
1. Validierungsstatus im Code prüfen
Du brauchst eine eigene Validierungslogik im Vue-Component-State oder über computed.

Beispiel:
´´´
---
<script setup>
import { computed } from 'vue'

const fromCategoryId = ref(null)

const isFromCategoryValid = computed(() => !!fromCategoryId.value)
</script>

<template>
  <div class="form-control">
    <label class="label">
      <span class="label-text">Quellkategorie</span>
      <span class="text-error">*</span>
    </label>
    <SelectCategory
      class="input"
      v-model="fromCategoryId"
    />
    <div class="validator-hint text-error" v-if="!isFromCategoryValid">
      Quellkategorie muss befüllt sein!
    </div>
  </div>
</template>
---
2. Validierung beim Submit auslösen
Ergänze z. B. in Deinem Form-Handling einen Check:

---
function handleSubmit() {
  if (!isFromCategoryValid.value) {
    // Fehler anzeigen, ggf. Scroll oder Fokus
    return
  }

  // Form absenden
}
---
´´´
