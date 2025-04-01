## Anpassung der Budget Category Column und Budget Month Card für kaskadierende Kategorien

Ziel ist die Implementierung von kaskadierenden Kategorien (Kategorien mit Eltern- und Kindbeziehungen) innerhalb der Budget View, und zwar sowohl in der `Budget Category Column` als auch in der `Budget Month Card`, sodass diese beiden Komponenten ein konsistentes Verhalten aufweisen.

**Änderungen an der Darstellung von Kategorien mit Unterkategorien:**

*   **Ersatz der Plus-/Minuszeichen:**  Die derzeitigen Plus- und Minuszeichen zur Anzeige des Ausklappzustands von Kategorien mit Unterkategorien sollen durch Chevron-Icons ersetzt werden.
    *   **Chevron nach unten (↓):**  Zeigt an, dass die Kategorie geschlossen ist und die Unterkategorien nicht sichtbar sind.
    *   **Chevron nach oben (↑):**  Zeigt an, dass die Kategorie geöffnet ist und die Unterkategorien angezeigt werden.

**Synchronisierung des Ausklappzustands:**

*   **Paralleles Collapse/Expand:** Der Ausklappzustand von Kategorien mit Unterkategorien muss zwischen der `Budget Category Column` und der `Budget Month Card` synchronisiert werden. Das bedeutet:
    *   Wenn eine Kategorie mit Unterkategorien in der `Budget Category Column` geöffnet/geschlossen wird, muss diese Änderung sich auch in den entsprechenden `Budget Month Cards` widerspiegeln und die Unterkategorien anzeigen/verbergen.
    *   Umgekehrt gilt dies auch: Wird eine Kategorie mit Unterkategorien in einer `Budget Month Card` geöffnet/geschlossen, muss dies sich auch in der `Budget Category Column` und den restlichen `Budget Month Cards` widerspiegeln.

**Aggregierte Salden und Transaktionen:**

*   **Inklusion von Kindkategorien:** Beim Anzeigen von Saldo und Transaktionen für eine Kategorie mit Unterkategorien in der `Budget Month Card` soll Folgendes berücksichtigt werden:
    *   **Eigene Buchungen:** Die Buchungen, die direkt auf die Mutterkategorie gebucht wurden, sollen wie bisher angezeigt werden.
    *   **Buchungen der Kindkategorien:** Zusätzlich zu den eigenen Buchungen sollen auch alle Buchungen, die auf die Kindkategorien der Mutterkategorie gebucht wurden, in der Saldo- und Transaktionsansicht mit aufsummiert werden. Die Aufsummierung muss ebenso angezeigt bleiben, wenn die Kindskategorien nicht sichtbar sind. Eine Elternkategorie trägt in dieseer Ansicht also grundsätzlich die Salden und Transaktionen von sich selbst zzgl. aller Kindskategorien aufsummiert.

**Zusammenfassend:** Die `Budget Month Card` soll den Gesamtsaldo und die Gesamttransaktionen anzeigen, die sich aus den direkten Buchungen auf die ausgewählte (Mutter-)Kategorie sowie den aggregierten Buchungen aller zugehörigen Kindskategorien zusammensetzen.
