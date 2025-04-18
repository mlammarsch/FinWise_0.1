1. Der Suchmechanismuss (Searchgroup) in der Transactionlist / TransactionView greift nur bei der Transactionlist. Wenn ich auf die src\components\transaction\CategoryTransactionList.vue gehe, möchte ich auch dort Volltext-filtern können.
2. Zeige in der src\components\transaction\CategoryTransactionList.vue bei den CATEGORYTRANSFER Buchungen nur immer die positivbetrags Buchung an. Blende die jeweilige Gegenbuchung aus. Das soll aber nur in der Ansicht sein. Belasse die volle Funktion, dass bei Bearbeitung und Löschung die Gegenbuchung immer mit beachtet wird.
3. Die Kontoprognosen stimmen nicht. Die Prognostizierten Salden von Regelbuchungsen müssen kumuliert dargestellt sein. Im Moment ist in jedem Zukunftsmonat der prognostizierte Saldo gleich der Ausgabe oder Einnahme im jeweiligen Monat. Bitte auch bei den Kategorieprognosen Berücksichtigen. Außerdem ist Bei der Saldenberechnung immer vom aktuellen Kontostand des Kontos oder der Kategorie auszugehen und die Prognosebuchungen sind dort aufzusummieren, passend der prognostizierten Buchungsdaten (Buchungstage).
4. Bringe bei der Planbuchung auch das dateValue mit ein. In der src\components\planning\PlanningTransactionForm.vue muss das setzbar sein. Das Verhalten und Zusammenspiel beider Felder bei der src\components\transaction\TransactionForm.vue abschauen. Änderung Date nimmt Wertstellung immer mit. Wertstellung verändert nichts an Date.
5. In der Select Account kann ich nicht mit den Pfeiltasten navigieren. Bitte diese Navigation an der SelectCategory abschauen und genauso umsetzen.
6. Wenn ich in einem Incognitobrowser die Website erstmals öffne ohne Daten zu haben, erscheint folgende Meldung:
monthlyBalanceStore.ts:35 Uncaught TypeError: Cannot read properties of undefined (reading 'forEach')
    at calculateMonthlyBalances (monthlyBalanceStore.ts:35:35)
    at loadMonthlyBalances (monthlyBalanceStore.ts:221:7)
    at monthlyBalanceStore.ts:231:3
    at pinia.js?v=505609c2:1171:96
    at EffectScope.run (chunk-U3LI7FBV.js?v=505609c2:365:16)
    at pinia.js?v=505609c2:1171:86
    at EffectScope.run (chunk-U3LI7FBV.js?v=505609c2:365:16)
    at pinia.js?v=505609c2:1171:52
    at fallbackRunWithContext (pinia.js?v=505609c2:929:38)
    at createSetupStore (pinia.js?v=505609c2:1171:22)
7. Kann es sein, dass der Browser nicht mitbekommt, welches Systemdatum wir haben? Ich stelle künstlich das Datum um und möchte eine Planbuchung durchführen. Wenn ich dann auch Auto-Ausführen klicke, kommt eine Browserabfrage mit der Info: 0 automatische Planungsbuchungen ausgeführt. Ich dachte, wenn ich diesen Button klicke, prüft die App das Systemdatum und führt die Buchungen durch die <= Planbuchungstag sind? Da liegt ein Fehler vor. Außerdem werden gebuchte Planbuchungen nicht im Transactionstore angezeigt. Es werden keine Buchungen angelegt, so dass sich alle Transaktionslisten nicht verändern. Da ist ein Bug.
8. Im src\components\budget\CategoryTransferModal.vue setze in der Überschrift bei Typ "transfer" die Überschrift: Transferiere von <geklickte Kategorie>... . Bei fill: "Fülle <geklickte Kategorie>..."
9. In der Transactionview möchte ich, dass die Umschalung zwischen TransactionList und CategoryTransactionList.vue wie in der Planningview, ebenfalls mit RegisterTABs umgesetzt wird anstelle der Buttons.
10. Setze entsprechende DebugLogs in die Planungsbereiche, wo man aktiv Events auslöst. Bei Schleifen wie z.B. Prognosensaldenberechnung nicht einzelne Schleifen loggen. Es reicht Anlage Pronose durchgeführt. Oder Auto-Buchung von Planungsbuchung XY vorgenommen. Nimm neben der Id auch immer den Namen oder die Bezeichnung der Eventaktivität mit rein.
