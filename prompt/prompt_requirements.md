1. Abhängig vom Mode soll das voreingestellte fromCategoryId oder toCategoryId im CategoryTransferModal.vue  ausgeblendet werden. Unsichtbar für den User. Aber dennoch im Model gesetzt.
Beispiel: Im Mode Fill ist toCategory bereits vorbefüllt. Der Block 
<fieldset>
          <legend class="text-sm font-semibold mb-1 select-none">
            Zu Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            v-model="toCategoryId"
            :filterOutArray="incomeCategoryIds"
          />
        </fieldset>

        kann unsichtbar gemacht werden. Der gesetzte Wert muss aber bei Abspeicherung übernommen werden.


2.In der Liste der Optionen wurden die Einnahmekategorien ausgeblendet. Soweit richtig. Die Stamkategorie "verfügbare Mittel" jedoch, muss bestehen bleiben und ganz oben über den Ausgaben erscheinen.Vermutlich wurde das mit dem Filter Einnahmen ausfiltern versehentlich weggefiltert? Prüfe im Categorystore, wie die Basis available oder verfügbare Mittel Kategorie ermittelt wird. Nicht mit lowertext suchen, da sich vielleicht auch mal der Name der Kategorie im Code ändern kann.