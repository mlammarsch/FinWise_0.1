1.
In der src\components\planning\PlanningTransactionForm.vue soll der Schalter "Ist dies eine Kontoüberweisung?" in eine Radio-Optionsgruppe geändert werden. Das Ziel dahinter ist, dass neben einem Kontotransfer schließlich auch ein Kategoorietransfer sein kann. Die Optionen sollen also sein:
- Einnahme (Hier die gleichen Abhängigkeiten mit dem Betragsfeld wie in src\components\transaction\TransactionForm.vue)
- Ausgabe (Hier die gleichen Abhängigkeiten mit dem Betragsfeld wie in src\components\transaction\TransactionForm.vue)
- Kontotransfer (Schau genau in TransactionForm.vue, wie sich die beiden Comboboxen untereinander verhalten)
- Kategorietransfer (Das ist neu, und soll neben der Kategorie auf der linken Seite ebenso eine Quelkategorie Combo öffnen und das Quellkonto soll verschwinden)
  - Bei dem Kategorietransfer soll in der rechten (Ziel) Kategorie-Optionsliste die Kategorie ausgeblendet werden, die in Quellkategorie gerade ausgewählt wurde. In der Quellkategorie sind immer alle vohanden. Wählt man da zufällig die aus, die auch in Ziel bereits eingetragen ist, so wird die im Ziel zunächst geleert.
  - Dieses Verhalten bitte 1:1 bei dem Kontotransfer im Zusammenspiel der beiden Comboboxen Quell- und Zielkonto nachziehen.
Schau Dir genau das Verhalten der Radios im Zusammenspiel mit dem Betragsfeld an in dem File: TransactionForm.vue. Farblich und funktionell soll das aus dem Transactionform übernommen werden. Die hier 4. Option soll so gefärbt sein, wie es der Transfer auch ist. Warning. Der aktuelle in PlanningTransactionForm.vue enthaltene +/- Schalter für die Betragsumschaltung kann dann entfallen.
Beim Kategorientransfer muss die Logik mit "Fällige Ausführen" entsprechend prüfen, ob der Prozess funktionieren kann und ggf. vervollständigen. Sowohl bei alle fälligen Buchungen und den Einzelausführungen im Planer.

2.
Diese Anforderung soll mehr Ordnung in die src\components\planning\PlanningTransactionForm.vue bringen. Im Augenblick ist alles in einem Dialog sichtbar. Ich möchte, dass der Bereich der Recurrency Einstellungen in einen anderen TAB verschoben wird.

Oben (Immer sichtbar außerhalb der TABS):
- Überschrift des Modals
- Planungstransaktionstyp-Radiogruppe
- Name der Planung,
- Empfänger und der Betrag, so wie der

Mitte TAB1:
- Datum und Wertstellung
- Quellkonto und Zielkategorie oder -konto
- Quellkategorie und ZielKonto oder -kategorie
- Tags

Mite TAB2:
- Datum und Wertstellung
- Schalter "wiederholt sich"
- Verschieben schalter
- Und alles weitere, was derzeit mit dem Recurrency zu tun hat.

Unten (Immer sichtbar außerhalb der TABS):
- Schalter nur Prognose
- Schalter Aktiv
- Notizen

Schau Dir in der PlanningView an, wie dort die TAB Gruppen Anstehende Buchungen, Kontoprognose und Kategrienprognose gestaltet sind. So hätte ich die TABS gernde in dem src\components\planning\PlanningTransactionForm.vue realisiert.

Zusätzliche Anforderungen
2.1 Das Feld Kategorie muss übrigens zum Pflichtfeld gemacht werden!
2.2 Übernehme bitte auch die Feldlabelgestaltung aus der TransactionForm.vue. Dort wurden mit Fieldset Legend gearbeitet, welche die Schrift der Labels deutlich verkleinerte und somit besser aussah:
        <legend class="fieldset-legend">
          Transfer-Konto (Pflicht bei Transfer)
        </legend>

Achte darauf, dass die bisherige Funktionalität nicht kaputtgeht. Immer das gesamte editierte File ausgeben!!!
