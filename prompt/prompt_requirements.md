1. In der src\components\planning\PlanningTransactionForm.vue, sofern ich auf Kategorientransfer umstelle (CATEGORYTRANSFER), wird beim ersten Speichern komischerweise nicht die Zielkategorie mit abgespeichert. Obwohl ich sie zuvor aber ausgewählt habe. Prüfe, was zu diesem Fehler führt.
2. Einige Felder sind mit Stern gekennzeichnet in der Oberläche. Dies sagt aus, dass es sich um Pflichtfelder handelt. Baue eine Sicherheit ein, sofern beim Speichern (abhängig des Buchungstypes) ein Pflichtfeld nicht befüllt ist, dass das Feld hervorgehoben wird und eine Speicherung nicht möchlich ist. Nur bei fehlendem Planungsnamen wird das nachhaltig geprüft. Allerdings erscheint da ein völlig unformatiertes Infofenster vom Browser. Besser wäre, wenn das jeweilige Feld einen error farbenen Rahmen bekäme, um optisch darauf hinzuweisen, dass entsprechendes Pflichtfeld unbefüllt ist. Wenn gleichzeitig mehrere Felder nicht korrekt befüllt sind, alle betroffenen einfärben.
3. Setze wie in der src\components\transaction\TransactionForm.vue auch, die Felder in eine Fieldset Klasse. Hier als Beispiel:
  <fieldset class="fieldset">
        <legend class="fieldset-legend">Konto</legend>
        <SelectAccount v-model="accountId" />
  </fieldset>
In der src\components\transaction\TransactionForm.vue sorgt das dafür, dass die Labels mit kleinerer Schrift erscheinen, was besser aussieht. Mach das bei allen Formularfeldern außer den Schaltern.
