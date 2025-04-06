## Prompt für KI zur Umsetzung von Planungsbuchungen und Automatisierungsregeln in FinWise

**Ziel:** Entwickle und implementiere die Funktionalität für Prognosebuchungen (Planbuchungen), Regeln für Metadatenergänzung und zugehörige Administrationsbereiche in der Finanzapplikation FinWise. Die Lösung soll eine nahtlose Integration mit den bestehenden Funktionen (Kontobewegungen, Transfers, Kategorisierung, Tagging, Notizen) gewährleisten, insbesondere der Budgetkategorien, die als Verrechnungskonten für das gesamte Budget-Kapital über alle Konten hinweg dienen.

**Phase 1: Analyse und Evaluation (Priorität: Hoch)**

1.  **Datenmodellanalyse:**
    *   **Transaktionen:** Untersuche intensiv die bestehenden Datenstrukturen für Transaktionen, besonders im Hinblick auf datumsorientierte Aggregationen, Berechnung von Kontosalden (inklusive der bestehenden Implementierung). Ziel: Performance und Korrektheit sicherstellen.
    *   **Budgetkategorien:** Analysiere Datenstruktur und Funktionalität der Budgetkategorien als Verrechnungskonten, inklusive Transferbuchungen zwischen Kategorien und deren Auswirkungen auf verfügbare Mittel.
    *   **Saldo-Persistierung:** Überprüfe die bisherige Persistierung der Salden. Die Datenstruktur muss später gewährleisten, dass ich Daten aus einer API pagen kann, um nicht alles immer laden zu müssen und aber dennoch die Konto-, Kategorien- und Prognosesaldis konsistent zu halten.
    *   **Planungsbuchungen (Vorhandene Implementierung):** Analysiere die bestehende Implementierung kritisch, um deren Eignung für die folgenden Anforderungen zu bewerten.
    *   **Ziel:** Erstelle einen Bericht, der die Eignung des aktuellen Datenmodells bewertet und notwendige Anpassungen zur Unterstützung der Planungsbuchungen und Automatisierung aufzeigt.
    *   **Berücksichtige:** Skalierbarkeit im Kontext von Paging und korrekte Saldenberechnung.
2.  **Definiere Datenmodell-Erweiterungen** auf Basis der Analyse, die die folgenden Elemente umfassen:
    *   **Separate Datenspeicherung für Planungsbuchungen (Planning Store):** Konzipiere eine klare Trennung zwischen Planungsbuchungen (mutable) und realen Transaktionen (immutable).
    *   **Persistierung von Running Balances:** Etabliere einen effektiven Mechanismus zur Persistierung und Aktualisierung von Running Balances über Konten, Kategorien und Planungsbuchungen hinweg. Nutze bereits umgesetzte Mechanismen.
    *   **Datenstruktur für Regeln:** Definiere eine flexible Datenstruktur zur Speicherung von Regeln für die automatische Metadatenergänzung.
    *   **Ziel:** Erstellung eines validierten und getesteten Datenmodells für die Erweiterungen. Achte dabei darauf, dass bestehende Funktionen bei Änderung weitreichend über mehrere betroffene Dateien angepasst werden müssen. Alte, beständige Funktionen müssen das weiterhin fehlerfrei leisten können, was heute bereits funktional getestet ist in der App.

**Phase 2: Implementierung der Planungsstruktur (Priorität: Hoch)**

1.  **Erstellung von Planungsbuchungen:**
    *   Implementiere die Eingabemöglichkeiten für Planungsbuchungen mit folgenden Attributen (Nutze und erweitere die Pages und Views: PlanningView und AdminPlanning und beachte dabei die Screenshots einer anderen, bestehenden App):
        *   `Recipient` (Empfänger)
        *   `Konto` (Betroffenes Konto)
        *   `Name` (Beschreibung)
        *   `Betrag` (Geplanter Betrag) mit Unterstützung für:
            *   `Ungefährer Wert`
            *   `Exakter Wert`
            *   `Wertebereich (Betrag A - Betrag B)`
        *   `Typ`: `Account Transfer`, `Expense`, `Income`, `Kategorie Transfer`
        *   `Datum` (Zeitpunkt)
        *   `Wiederholung (Optional)`:
            *   `Häufigkeit` (Tage, Wochen, Monate, Jahre)
            *   `Tag der Ausführung` (Monatlich/Wöchentlich)
            *   `Ende der Wiederholung`: `Unendlich`, `Anzahl`, `Datum`

2.  **Verwaltung von Budgetverschiebungen:**
    *   Ermögliche die Erstellung von Planungsbuchungen für Transfers zwischen Budgetkategorien (z.B. monatliche Überweisung von einem Konto in die Kategorie "Tanken").

3.  **Metadaten für Planungsbuchungen:**
    *   Ermögliche die Zuweisung folgender Metadaten zu erstellten Planungsbuchungen:
        *   `Tags`
        *   `Kategorien`
        *   `Notizen`

4.  **Planung von Umbuchungen:**
    *   Unterstütze die Vorplanung von Account- und Kategorie-Transfers.

**Phase 3: Kontoprognosen Visualisierung (Priorität: Mittel)**

1.  **Saldo-Prognosen:**
    *   Stelle Kontosalden in der Zukunft basierend auf den geplanten Transaktionen dar.
    *   Visualisiere die Prognosen als Chart oder Tabelle.
    *   Nutze den aktuellen Kontostand und alle bisherigen Transaktionen als Ausgangsbasis.
    *   Implementiere die Prognosen für Konten und Kategorien.

2.  **Budgetanzeige:**
    *   Integriere die Planungsbuchungen in die Budget-Views.
    *   Zeige die geplanten Buchungen in den entsprechenden Budgetkategorien für den jeweiligen Monat an.
    *   Berücksichtige positive und negative Auswirkungen auf den Budgetwertsaldo.

**Phase 4: Regeln zur automatischen Metadatenergänzung (Priorität: Hoch)**

1. **Implementiere Regel-Engine:**
    *   Erstelle eine flexible Regel-Engine, die es ermöglicht, Regeln zu definieren, die Metadaten automatisch zu Planungsbuchungen zuweisen.
    *   Die Regeln sollen sowohl auf Account/Category Transfers als auch Expenses/Income angewendet werden können.
    *   Definiere klare Prioritäten, falls mehrere Regeln auf eine Buchung zutreffen.

**Phase 5: Administration und Automatisierung (Priorität: Niedrig - MVP: Manuell triggerbar)**

1.  **Manuelle Automatisierung (MVP):**
    *   Implementiere einen Button auf der AccountAdmin Page, der manuell einen Automationslauf auslöst. Dieser simuliert das Umwandeln von Planungsbuchungen in reale Transaktionen anhand der aktuellen (simulierten) Systemzeit.
    *   **Hinweis:** Die Automatisierung soll im Beta-Stadium primär manuell triggerbar sein, mit der Perspektive auf vollständig automatisierte Ausführung.

**Phase 6: Datenpersistenz und Prognoseberechnung (Priorität: Hoch - Integriert in alle anderen Phasen)**

1.  **Planning Store Implementierung:**
    *   Implementiere den separaten "Planning Store" zur Speicherung von Planungsbuchungen.
2.  **Prognoseberechnung:**
    *   Gestalte die Prognoseberechnungen so flexibel, dass sich Änderungen an Planungen sofort auf die zukünftigen Prognosen auswirken.
3.  **Running Balance Persistierung:**
    *   Implementiere geeignete Vorkehrungen, um eine saubere RunningBalance über Konten, Kategorien und Prognosebuchungen zu gewährleisten, unter Berücksichtigung wiederholter Buchungen.
    *   **Berücksichtige:** Die Möglichkeit, später nur Teile des Finanzhaushaltes aus der API zu beziehen (Datenpaging) und trotzdem reale laufende Saldi im App weiterberechnen zu können.

**Zusätzliche Anweisungen:**

*   Beachte bei allen Implementierungen die bestehenden Coding Guidelines und Architekturen von FinWise.
*   Beschreibe wichtige Tests für Teile der app nach Deiner Umsetzung. Bringe Testbeispiele an, die ich dann sorgfältig testen kann.
*   Dokumentiere den Code nach unseren Kommentarregeln aus dem Systemprompt.
*   Liefere einen detaillierten Plan für die inkrementelle Entwicklung und den Test der einzelnen Features, damit ich erkennen kann, dass Du alles korrekt verstanden hast. Wir wollen schrittweise vorgehen und nicht die komplette umsetzung auf einen schlag vornehmen. Priorisiere die Umsetzung in logischer Folge, abhängig der Module, die Du benötigst pro Umsetzungsphase.
*   Dokumentieren und evaluieren bestehende Lösungen bevor sie neu Implementiert werden.
*   Orientiere Dich bei Formular Dialogen an bspw. TransactionForm.vue, CategoryTransferModal.vue oder Accountform.vue. Dort werden auch bestehende ui Komponenten benutzt, die auch im Bereich der Planung genutzt werden sollten.
*   Select UI Komponenten: Mit der SelectCategory und auch der SelectAccount.vue sind leistungsstarke Comboboxen entstanden. Mach eine solche noch für den Recipient.

**Erwartungen:**

*   Funktionierende Implementierung der Planungsbuchungen und Automatisierungsregeln in FinWise.
*   Sicherstellung einer nahtlosen Integration mit den bestehenden Funktionen ohne bestehende Funktionalität zu beschädigen.
*   Hohe Codequalität und Testabdeckung.
* Wenn es sich anbietet, bestimmte UI Komponenten fest anzulegen zwecks Wiederverwendbarkeit, nutze das. Schau auch auf bestehende Komponenten. CurrencyInput, -Display, SelectCategory oder -Recipient, -Account, etc.
