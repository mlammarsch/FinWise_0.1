Ich benötige Änderungen bei dem TransactionImportModal für csv-Dateien. Ich möchte einmal, dass der Dialog breiter wird und die Datenmappingfelder in einem 3er grid und damit enger dargestelltwerden, um die Tabelle unten besser auszunutzen. Das Statusfeld für Bereit oder Duplikat sollte ein kleines Badge Soft sein (success & warning). Besser wäre sogar nur ein abhängiges Icon in der jeweiligen Farbe, um Platz zu gewinnen.

Bei der Suche nach der Empfängerähnlichkeit soll auch das Feld Notizen, sofern es gemappt ist, mit einbezogen werden, da manchmal der Empfänger auch aus der Notiz heraus erkennbar ist. Die Tabelle mit der Datenvorschau soll immer 10 Zeilen enthalten und die Paging-Komponente mit integrieren. Orientiere dich dabei an dem Dialog src\views\admin\AdminRecipientsView.vue und nutze src\components\ui\PagingComponent.vue.

Wenn ein Empfänger in einer Box editiert wurde, und der gleiche Empfänger auch in weiteren Buchungen zu finden ist, soll auch dort automatisch das Mapping erfolgen.

Nimm die Checkboxen nicht full rounded, sondern orientiere Dich an der src\components\transaction\CategoryTransactionList.vue in Sachen Checkboxen design und auch die Funktionalität bezgl. Multiselection mit Shifttaste.
