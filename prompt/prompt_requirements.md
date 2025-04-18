1.) In der BudgetMonthCard müssen alle Planungsbuchungen in Spalte 1 (Budget) in den jeweiligen Kategorien dargestellt werden Buchungsmonat zugehörig. Hier ist aber wichtig, dass Ausgaben bei den Ausgabekategorien positiv dargestellt werden (nur Darstellung). Diesen positiven Wert mit der CurrencyDisplay aber nicht grün, sondern normale Textfarbe belassen. Bei den Einnahmekategorien wird die Einnahme in standard success mit CurrencyDisplay dargestellt. Geht der Budgetwert ins Minus, bei beiden die Wertee in Farbe error anzeigen (CurrencyDisplay Standard). Der Budgetwert ist immer die Summe aller auf die jeweilige Kategorie gefallenen Buchungen. Zusätzlich werden Kategoriebudgets auf aufsummiert auf ihre Mutterkategorie. Die Mutterkategorie hat also gleichermaßen die Summe ihres Budgets anzuzeigen, plus die Summe ihrer Kinder.
2.) Erweitere die 3. Spalte (Saldo) der jeweiligen Kategorie um den Budgetbetrag (hier allerdings die negierte Darstellung aus Budget ignorieren und mit den tatsächlichen Minuswerten rechnet bei Ausgaben). Bisher war Saldo: Saldo Vormonat + Transaktionen + Transfers. Jetzt noch + Budget mit hinzunehmen. Auch hier das Mutter-Kindverhalten mit einbeziehen.
Die Ausgangsrechnung Saldo Vormonat plus ... gilt auch in der Zukunft. Bsp. Laufender Monat ist jetzt gerade April. Dann will ich bei den Mai Salden ausgehend des Endsaldos des aktuellen Aprilmonats inkl. seiner Prognosen bis Monatsende im Mai weiterrechnen. Prognosebuchungen in der Saldoberechnung also nie ausblenden.
3. Noch immer habe ich das Problem, dass beim Öffnen der App in einem neuen Browser (ohne LocalStorage Befüllung) nichts angezeigt wird und diese Meldung kommt:
monthlyBalanceStore.ts:74 Uncaught TypeError: Cannot read properties of undefined (reading 'filter')
    at calculateBalanceForMonth (monthlyBalanceStore.ts:74:55)
    at monthlyBalanceStore.ts:58:24
    at Array.forEach (<anonymous>)
    at calculateMonthlyBalances (monthlyBalanceStore.ts:56:31)
    at loadMonthlyBalances (monthlyBalanceStore.ts:260:7)
    at monthlyBalanceStore.ts:270:3
    at pinia.js?v=505609c2:1171:96
    at EffectScope.run (chunk-U3LI7FBV.js?v=505609c2:365:16)
    at pinia.js?v=505609c2:1171:86
    at EffectScope.run (chunk-U3LI7FBV.js?v=505609c2:365:16)

Wenn Localstorage noch nicht verfügbar, lege die Seed an.
