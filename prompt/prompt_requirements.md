1. Beim Öffnen der Select Account kommt Konsolenfehler:
main.ts:21 <Suspense> is an experimental feature and its API will likely change.
chunk-U3LI7FBV.js?v=8003b7b0:2116 [Vue warn]: Unhandled error during execution of native event handler
  at <SelectAccount modelValue="59fe7044-baa2-4b79-ac57-2305aceac92c" onUpdate:modelValue=fn >
  at <PlanningTransactionForm onSave=fn<savePlanning> onCancel=fn >
  at <PlanningView onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< Proxy(Object) {__v_skip: true} > key=0 >
  at <RouterView>
  at <AppLayout>
  at <App>
warn$1 @ chunk-U3LI7FBV.js?v=8003b7b0:2116
logError @ chunk-U3LI7FBV.js?v=8003b7b0:2327
handleError @ chunk-U3LI7FBV.js?v=8003b7b0:2319
callWithErrorHandling @ chunk-U3LI7FBV.js?v=8003b7b0:2265
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=8003b7b0:2270
invoker @ chunk-U3LI7FBV.js?v=8003b7b0:11202
chunk-U3LI7FBV.js?v=8003b7b0:2332 Uncaught ReferenceError: nextTick is not defined
    at toggleDropdown (SelectAccount.vue:160:5)
    at callWithErrorHandling (chunk-U3LI7FBV.js?v=8003b7b0:2263:19)
    at callWithAsyncErrorHandling (chunk-U3LI7FBV.js?v=8003b7b0:2270:17)
    at HTMLInputElement.invoker (chunk-U3LI7FBV.js?v=8003b7b0:11202:5)
toggleDropdown @ SelectAccount.vue:160
callWithErrorHandling @ chunk-U3LI7FBV.js?v=8003b7b0:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=8003b7b0:2270
invoker @ chunk-U3LI7FBV.js?v=8003b7b0:11202

2. In den anstehenden Buchungen erscheinen künftige Buchungen keine 24 Monate lang. Ich möchte bspw. eine Endlos angelegte, sich monatlich wiederholende Buchung bis 24 Monate in den anstehenden Buchungen sehen. Diese Werte werden auch gebraucht zur Kontoprognosendarstellung. Wie weit in die Zukunft werden angelegte Planbuchungen interpoliert?

3. Unbedingt prüfen, warum eine ausgeführte Planbuchung noch minutenlang in den Anstehenden Buchungen im PlanningView stehenbleibt und dann erst verschwindet. Außerdem werden weder Kontosalden aktualisiert, noch sieht man diese auto angelegten  Transaktion in TransactionList und Accountview (Transactionlist). Ausgeführte Planbuchungen müssen komplett alles aktualisieren.
