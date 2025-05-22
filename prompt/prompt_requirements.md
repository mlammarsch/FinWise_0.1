Ziel: Implementierung einer korrekten und robusten Logik zur Erzeugung von Transaktionen nach der Ausführung von Planbuchungen, wenn der "Forecast Only"-Modus deaktiviert ist. Dies umfasst die korrekte Behandlung von Kontoüberweisungen und die Gewährleistung der Datenintegrität.

Kontext:

Dieser Prompt bezieht sich ausschließlich auf den Fall, in dem der "Forecast Only"-Modus in der Planungsübersicht deaktiviert ist. Eigentlich sollte es schon richtig implementiert sein. Dieser Task soll nach dieser massiven Architekturänderung den Sachverhalt neu prüfen und nachkorrigieren, falls noch fehlerhaft-


Aufgaben:

Kein Kontotransfer (istransfer=false):

Wenn in der Planungsbuchung kein Kontotransfer () festgelegt ist, erzeuge eine Transaktion vom Typ "Expense" oder "Income" (abhängig von der Art der Planbuchung Ausgabe oder Einnahme) mit der entsprechenden Kontobewegung.
Stelle sicher, dass die erzeugte Transaktion alle relevanten Daten enthält, einschließlich Datum, Betrag, Beschreibung und Kategorie. Kategorie darf nicht leer sein und muss in der src\components\planning\PlanningTransactionForm.vue auch zu einem required field gemacht werden. Bei EXPENSE und INCOME muss dann also eine Kontobewegung und gleichzeitig eine Kategorienbewegung aufgezeichnet werden, sobald eine Planbuchung ebtsprechend ausgeführt wird. (onlyForecast = false).
Valididiere vor Transaktionserstellung die Daten um Fehler frühzeitig zu entdecken.

Kontotransfer (istransfer=true):

Wenn in der PlanningView ein Kontotransfer festgelegt ist, erzeuge eine Transaktion vom Typ "ACCOUNTTRANSFER", die zwei Buchungen beinhaltet :
Eine Abhebung vom Quellkonto.
Eine Gutschrift auf das Zielkonto.
Hinweis: Diese Doppelbuchung sollte in den Transaktionsservice bereits implementiert sein. Sorge für den korrekten Aufruf

Stelle sicher, dass die beiden Buchungen korrekt miteinander verknüpft sind und den gleichen Betrag und das gleiche Datum aufweisen und am Ende auh eine Verlinkung zu dieser Planbuchung enthalten.
Valididiere vor Transaktionserstellung die Daten um Fehler frühzeitig zu entdecken.

Ein "CATEGORYTRANSFER" existiert im Planbuchungsmodus nicht und kann ignoriert werden. Stelle sicher, dass die Logik dies berücksichtigt und keine unnötigen Operationen ausführt. Der CategoryTransfer für eine Planbuchung erstellen wir direkt danach, wenn die oben gepromptete Lösung vollständig funktioniert.

Erwartetes Ergebnis:

- Eine korrekte und zuverlässige Erzeugung von Transaktionen nach Ausführung von Planbuchungen, wenn der "Forecast Only"-Modus deaktiviert ist.
- Korrekte Behandlung von Kontoüberweisungen mit der Erzeugung von zwei entsprechenden Buchungen.
- Vollständige und konsistente Transaktionsdaten.
- Validierung der Daten vor der Transaktionserstellung, um sicherzustellen, dass die Buchung korrekt und vollständig erfolgt.
