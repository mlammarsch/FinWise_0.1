# Änderungsanforderungen
## Anzahl wiederholungsbuchungen
Es muss hier irgendwo ein Fehler vorliegen.
 // Korrekte Zählung bei RecurrenceEndType.COUNT (Zählung beginnt bei 0)
      if (
        planTx.recurrenceEndType === RecurrenceEndType.COUNT &&
        planTx.recurrenceCount !== null &&
        count >= (planTx.recurrenceCount)
      ) {
        break;
      }

Nach der Korrektur wird mir bei leeren Stores irgendwie die Anlage der Plan und Prognosebuchungen nicht korrekt berechnte. Hauptsächlich  bei der Radio Option "nach x Wiederholungen". Es wird trotz angabe, dass drei Buchungen erstellt werden sollen, wird jetzt nur eine Buchung erstellt. Hängt das mit den noch leeren Stores zusammen? Kannst Du das irgendwie sicherstellen, dass bei Einrichtung einer Planbuchung mit x Wiederholungen so viele PrognoseBuchungen angelegt werden, wie ich als Zahl in der Anzahl hinterlegt habe? Inklusive dieser Instanz der Planbuchung. Lege ich also am 28.4. eine Buchung mit der Anzahl 3 Wiederholungen an, so sollen 3 Prognosen 28.4., 28.5. und 28.6. angelegt werden. Nicht mehr und nicht weniger.
