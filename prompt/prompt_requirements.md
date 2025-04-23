1.
In der src\components\planning\PlanningTransactionForm.vue soll der Schalter "Ist dies eine Kontoüberweisung?" in eine Radio-Optionsgruppe geändert werden. Das Ziel dahinter ist, dass neben einem Kontotransfer schließlich auch ein Kategoorietransfer (Enum: CATEGORYTRANSFER) sein kann. Die Optionen sollen also sein:
- Einnahme
  - Hier die gleichen Abhängigkeiten mit dem Betragsfeld wie in src\components\transaction\TransactionForm.vue
  - Wichtig ist, dass es immer auch ein Konto geben muss für eine INCOME Buchung; Combo und Feld dafür zeichnen.
- Ausgabe
  - Hier die gleichen Abhängigkeiten mit dem Betragsfeld wie in src\components\transaction\TransactionForm.vue
  - Wichtig ist, dass es immer auch ein Konto geben muss für eine INCOME Buchung; Combo und Feld dafür zeichnen.
- Kontotransfer (Schau genau in TransactionForm.vue, wie sich die beiden Comboboxen untereinander verhalten)
- Kategorietransfer (Das ist neu, und soll neben der Kategorie an Stelle des Quellkonto, die neu hinzuzufügende Quellkategorie Combo darstellen. Vorlage src\components\budget\CategoryTransferModal.vue und src\components\transaction\TransactionForm.vue)
  - Bei dem Kategorietransfer soll in der rechten (Ziel) Kategorie-Optionsliste die Kategorie ausgeblendet werden, die in Quellkategorie gerade ausgewählt wurde. In der Quellkategorie sind immer alle vohanden. Wählt man da zufällig die aus, die auch in Ziel bereits eingetragen ist, so wird die im Ziel zunächst geleert.
  - Dieses Verhalten bitte 1:1 bei dem Kontotransfer im Zusammenspiel der beiden Comboboxen Quell- und Zielkonto nachziehen.
Schau Dir genau das Verhalten der Radios im Zusammenspiel mit dem Betragsfeld an in dem File: TransactionForm.vue. Farblich und funktionell soll das aus dem Transactionform übernommen werden. Betroffenes Verhalten war dort:
- Abhängig welchen Betrag ich eingebe (< oder > 0), wurde die Option EXPENSE oder INCOME gewählt
- Wenn ich die RadioOption Ausgabe (EXPENSE) aktiviere, wird der Betrag mit einem - vorangestellt. Ansonsten immer ohne Minus.
- bei den beiden Transfertypes (ACCOUNTTRANSFER, CATEGORYTRANSFER) hat das Betragsfeld keine Relevanz mehr für die Optionierung der Radiobuttons.

Die hier 4. Option soll so gefärbt sein, wie es der Transfer auch ist. Warning. Der aktuelle in PlanningTransactionForm.vue enthaltene +/- Schalter für die Betragsumschaltung kann dann entfallen, da die Radiooption das künftig übernimmt.

Beim CATEGORYTRANSFER muss die Logik mit "Fällige Ausführen" entsprechend prüfen, ob der Prozess funktionieren kann und ggf. vervollständigen. Sowohl bei alle fälligen Buchungen und den Einzelausführungen im Planer. Wichtig dabei ist, dass hier keine physische Kontoüberweisung stattfindet, sondern nur, wie in der src\components\budget\CategoryTransferModal.vue eine Überweisung des Types CATEGORYTRANSFER stattfinden soll. Entsprechend bitte die PlanningService überarbeiten, damit dort entsprechende CATEGORYTRANSFERS in der TransactionService getriggert werden. Es ist ultrawichtig, dass Du die Geschäftslogik hier genauestens überprüfst.

2.
Diese Anforderung soll mehr Ordnung in die src\components\planning\PlanningTransactionForm.vue bringen. Im Augenblick ist alles in einem Dialog sichtbar. Ich möchte, dass der Bereich der Recurrency Einstellungen in einen anderen TAB verschoben wird.

Oben (Immer sichtbar außerhalb der TABS):
- Planungstransaktionstyp-Radiogruppe (Farbdarstellung aus der TransactionForm.vue übernehmen)
- Name der Planung,
- Betrag und entsprechende Zusatz Radios (entferne +/- Button)
- Datum und Wertstellung

Mitte TAB1 (Name: Kategorisierung):
- Empfänger
- Quellkonto und Zielkategorie (EXPENSE, INCOME) oder -konto (ACCOUNTTRANSFER)
- Quellkategorie und Zielkategorie (CATEGORYTRANSFER)
- Tags

Mitte TAB2 (Name: Wiederholung):
- Schalter oder Checkbox "wiederholt sich"
- Wegen Wochenende Verschieben schalter
- Und alles weitere, was derzeit mit dem Recurrency zu tun hat.
- Prognose Daten der bis zu 6 künftigen Buchungen wie derzeit umgesetzt.

Unten (Immer sichtbar außerhalb der TABS):
- Schalter nur Prognose
- Schalter Aktiv
- Notizen

Schau Dir in der PlanningView an, wie dort die TAB Gruppen Anstehende Buchungen, Kontoprognose und Kategrienprognose gestaltet sind. So hätte ich die TABS gernde in dem src\components\planning\PlanningTransactionForm.vue realisiert.

Achte darauf, dass die bisherige Funktionalität nicht kaputtgeht. Immer das gesamte editierte File ausgeben!!!
