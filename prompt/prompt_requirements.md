Ziel: Umfassende Fehlerbehebung und Optimierung der Planbuchungsfunktionen, um eine zuverlässige und genaue Verarbeitung von Planbuchungen, insbesondere im Hinblick auf vergangene, überfällige und regelmäßige Buchungen, zu gewährleisten.

Kontext:

Beim Anlegen einer Planbuchung wird das erste Datum als das erste geplante Ausführungsdatum festgelegt.
Für Regelbuchungen wird eine Prognose generiert, wobei die Folgevorkommnisse automatisch berechnet werden (bereits implementiert).
Die Funktionen executeAutomaticTransactions() und executePlanning(planningId: string, date: string) sind für die korrekte Ausführung der Planbuchungen entscheidend.

Aufgaben:

executeAllDuePlanningTransactions():

Korrigiere die Funktion so, dass sie alle vergangenen, noch auszuführenden Planbuchungen identifiziert und verarbeitet. Derzeit werden ausschließlich Planbuchungen berücksichtigt, deren Ausführungsdatum exakt dem aktuellen Systemdatum entspricht.
Berücksichtige bei der Suche nach überfälligen Buchungen die Zeitzone des Systems und die Zeitzone der Planbuchung, um Inkonsistenzen zu vermeiden.
Stelle sicher, dass die Funktion effizient ist und keine unnötigen Datenbankabfragen verursacht, insbesondere bei großen Datenmengen.

Regelbuchungen (Folgebuchungen):

Passe die Funktion so an, dass bei Regelbuchungen, die mehrere Ausführungsdaten in der Vergangenheit überfällig sind (z.B. eine monatliche Planung mit zwei Monaten Überschreitung), die fehlenden Folgebuchungen automatisiert anhand der bestehenden Regel kalkuliert und ausgeführt werden.
Implementiere eine Logik, die verhindert, dass bei der Erstellung von Folgebuchungen unendliche Schleifen entstehen.
Dokumentiere die Logik zur Berechnung der Folgebuchungen detailliert, um die Wartbarkeit zu gewährleisten.

executeAutomaticTransactions() und executePlanning(planningId: string, date: string):

Überprüfe und behebe alle weiteren Fehler in diesen Funktionen, die im Zusammenhang mit der Ausführung von Planbuchungen stehen.
Implementiere eine robuste Fehlerbehandlung in diesen Funktionen, um unerwartete Ausnahmen abzufangen und aussagekräftige Fehlermeldungen zu protokollieren.

Erwartetes Ergebnis:

Eine vollständig korrigierte und optimierte executeAllDuePlanningTransactions()-Funktion, die alle überfälligen Planbuchungen zuverlässig verarbeitet.
Eine fehlerfreie und automatisierte Erstellung von Folgebuchungen für überfällige Regelbuchungen.
Robuste und zuverlässige executeAutomaticTransactions() und executePlanning()-Funktionen, die alle Planbuchungen korrekt ausführen.
Aussagekräftige Protokollierung von Fehlermeldungen, um die Fehlersuche zu erleichtern.
