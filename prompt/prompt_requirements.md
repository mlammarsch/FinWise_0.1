## Spezifikation: Phase 2 - Erstellung und Validierung von Planbuchungen

Diese Spezifikation beschreibt die zweite Phase der Implementierung von Prognosebuchungen in der Finanzapplikation. Ziel dieser Phase ist die Entwicklung einer Benutzeroberfläche (UI) zur Erstellung von Planbuchungen sowie die Implementierung der notwendigen Validierungsmechanismen, um die Datenintegrität sicherzustellen.

**I.  Benutzeroberfläche (UI) zur Erstellung von Planbuchungen:**

Es wird eine Benutzeroberfläche entwickelt, die es dem Benutzer ermöglicht, Planbuchungen gemäß den in der vorherigen Spezifikation definierten Datenmodellen zu erstellen und zu bearbeiten. Die UI soll intuitiv und benutzerfreundlich sein und alle notwendigen Felder zur Erfassung der Planbuchungsdaten bereitstellen. Prüfe dazu die bestehende src\views\PlanningView.vue und src\views\admin\AdminPlanningView.vue. Diese UIs sollen dahingehend funktional gemacht werden.

*   **Layout und Navigation:**
    *   Die UI wird als eigener Bereich innerhalb der Applikation implementiert (z.B. "Planung" oder "Prognosen").
    *   Die Navigation soll einfach und übersichtlich sein, um das Erstellen, Bearbeiten und Anzeigen von Planbuchungen zu erleichtern.
*   **Formularelemente:**
    *   Für jedes Datenfeld im Planbuchungs-Store werden entsprechende Formularelemente bereitgestellt:
        *   Textfelder für `recipient`, `name`, `notes`.
        *   Dropdown-Menüs für `accountId`, `categoryId`, `type`, `frequency`, `endType`, `dayOfWeek`.
        *   Zahlenfelder für `amount`, `interval`, `dayOfMonth`, `count`, `amountFrom`, `amountTo`.
        *   Datumsauswahl für `date`, `endDate`.
        *   Checkbox für `shiftWeekend`.

      Erstelle für das Dropdown Account ebenso eine neue Komponente wie es SelectCategories.vue bereits ist in selbem Style und selber Funktion. Nur auf Konten bezogen. Splitte hier auch mit Überschriften, die aus den Accountgroups kommen.
      Zahlenfelder schau in die CurrencyInput für Formularfelder und Currency Display für die Darstellung.
*   **Wiederholungsoptionen:**
    *   Die UI soll die Möglichkeit bieten, die Wiederholungsoptionen (Recurrence) übersichtlich darzustellen und einfach zu konfigurieren.
    *   Abhängig von der gewählten `frequency` (täglich, wöchentlich, monatlich, jährlich) werden die entsprechenden Felder zur Konfiguration der Wiederholung angezeigt (z.B. `dayOfWeek` für wöchentliche Wiederholung, `dayOfMonth` für monatliche Wiederholung).
*   **Validierungshinweise:**
    *   Die UI soll Validierungshinweise in Echtzeit anzeigen, um den Benutzer auf fehlerhafte oder fehlende Eingaben hinzuweisen.
*   **Speichern und Abbrechen:**
    *   Buttons zum Speichern der Planbuchung und zum Abbrechen der Erstellung/Bearbeitung sind vorhanden.
*   **Responsives Design:** Die UI muss responsiv sein und auf verschiedenen Bildschirmgrößen (Desktop, Tablet, Smartphone) optimal dargestellt werden.

**II.  Validierungsmechanismen:**

Um die Datenintegrität im Planning Store sicherzustellen, werden die folgenden Validierungsmechanismen implementiert:

*   **Client-seitige Validierung:**
    *   Die UI validiert die Eingaben des Benutzers bereits beim Ausfüllen des Formulars.
    *   Folgende Validierungen werden durchgeführt:
        *   **Pflichtfelder:** Überprüfung, ob alle Pflichtfelder ausgefüllt sind.
        *   **Datentypen:** Überprüfung, ob die eingegebenen Werte den richtigen Datentypen entsprechen (z.B. Zahlen in Zahlenfeldern, Datumsangaben im Datumsfeld).
        *   **Wertebereiche:** Überprüfung, ob die eingegebenen Werte innerhalb der zulässigen Wertebereiche liegen (z.B. `dayOfMonth` zwischen 1 und 31).
        *   **Logische Zusammenhänge:** Überprüfung logischer Zusammenhänge zwischen den Feldern (z.B. `endDate` muss nach `date` liegen, wenn `endType` auf `DATE` gesetzt ist; `dayOfMonth` ist nur relevant, wenn `frequency` auf `MONTHLY` gesetzt ist).



**V.  Nächste Schritte:**

1.  **UI Design:** Erstellung eines detaillierten UI-Designs für die Planbuchungs-Funktionalität.
2.  **Implementierung der UI:** Entwicklung der UI basierend auf dem UI-Design und den oben genannten Anforderungen.
3.  **Implementierung der Validierungen:** Implementierung der Client-seitigen und Server-seitigen Validierungsmechanismen.
