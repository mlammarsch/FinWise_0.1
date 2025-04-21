Ziel: Implementierung eines "Forecast Only"-Modus in der Planungsübersicht, um präzise Prognosebuchungen zu ermöglichen, ohne dabei tatsächliche finanzielle Transaktionen auszulösen.  Dieser Modus soll die Planung von zukünftigen finanziellen Szenarien erleichtern, ohne die aktuellen Finanzdaten zu beeinträchtigen.

Kontext:

Aktuell existiert in der PlaningTransactionForm ein "Auto Ausführen"-Button, der Planbuchungen mit aktiviertem "Automatisch Ausführen"-Schalter verarbeitet.

Aufgaben:

UI-Änderung:

Ersetze den bestehenden "Automatisch Ausführen"-Schalter durch eine klare und intuitive "Forecast Only"-Option (Checkbox oder Toggle-Switch).
Benenne den "Auto Ausführen"-Button in "Nur Prognosebuchung" um, um die Funktion klar zu kommunizieren.

Logik des "Forecast Only"-Modus:

"Forecast Only" aktiviert (true):

Beim Klicken des "Auto-Ausführen"-Buttons in der PlanningView sollen ausschließlich die Daten der Planbuchungen auf das nächste geplante Ereignisdatum basierend der Planbuchungseinstellung (Intervall, Einzelbuchung, etc.) aktualisiert werden. Die Funktion executeAutomaticTransactions() und executePlanning(planningId: string, date: string) soll im "Forecast Only"-Modus so angepasst werden, dass keine realen Transaktionen im Transaction Service angelegt werden. Der bisherige "Auto Ausführen"-Schalter in der Form und dessen zugehörige Logik werden vollständig ersetzt, bzw. abgeändert.
Bei solch markierten Planbuchungen erfolgt nur die Datumsumstellung auf die nächste Fälligkeit. Danach müssen alle Prognosesalden aktualisiert werden. Filterung der aufzusuchenden Planbuchungen ist Datum der Planbuchung inkl. seiner Prognosen, deren Datum <= heute sind (Bei Regelbuchung auch die Prognosen einbeziehen!). Hier ist gerade ein Fehler, der nur Planbuchungen sucht, die dem aktuellen Systemdatum gleich kommen. Prognosebuchungen in der Zukunft liegend, bleiben unbeachtet.

"Forecast Only" deaktiviert (false):

Das gleiche Verhalten wie unter true. Ausnahme hier: Es müsse realte Transaktionen angelegt werden. Nicht nur Kategorietransaktionen, sondern auch Kontotransaktionen. Type INCOME und EXPENSE abhängig ob reine Ausgabe mit Kategorie oder ohne. Oder aber bei aktivierter Konto Transfer Planbuchung ein ACCOUNTTRANSFER von Quellkonto zu Zielkonto ohne Kategorie

Erwartetes Ergebnis:

- Ein vollständig implementierter und funktionierender "Forecast Only"-Modus in der Planungsübersicht.
- Sicherstellung, dass keine realen Transaktionen bei aktivierter "Forecast Only"-Option erzeugt werden. Die entsprechenden Funktionen gibt es bereits in den Transactiondateien und müssen nur richtig aufgerufen werden abhängig des Buchungstyps.
- Klare und verständliche UI-Elemente zur Bedienung des "Forecast Only"-Modus.
