Die Filterfunktion der Paging Komponente in der Budgetview funktioniert nicht richtig.
Wir filtern dort nach valueDate. Dasvollkommen korrekt ist. Wichtig jedoch ist, dass wir nur nach Datumswerten filtern mssen und nicht nach Timestamps. Im Augenblick, werden Daten, die am letzten des Vormonats wertgestellt sind, im Folgemonat in die Auswertung genommen. D.h. Buchung x/y ist datiert 31.3. und wird in der Budget view jedoch im April angezeigt.
Hier wird Start Enddatum einer Datums Range für die beiden BudgetMonth* Komponenten nicht korrekt gesetzt. Im formatters ist da eine Funktion implementiert, die für das richtige Datumsformat sorgen würde. Prüfe bitte alle Files ab, ob noch irgendwo ein Timestamp berücksichtigt ist. Es soll Zeitzonenunabhängig ausschließlich nach Datumswerten gearbeitet werden.

Alle Konstruktionen mit new Date(...) im Monatskontext müssen normiert mittels toDateOnlyString (aus formatters.ts) → explizit konvertieren zu "YYYY-MM-DD", dann wieder zu Date.
Setze das insbesondere in der budgetView und in der BudgetMonthCard um. Achte auf die richtigen Pfade bei den imports.
Prüfe alle weiteren Dateien noch, ob dort nicht noch mehr normiert werden muss?
