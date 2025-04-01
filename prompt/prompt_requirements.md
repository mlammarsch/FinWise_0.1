main.ts:21 <Suspense> is an experimental feature and its API will likely change.
CategoryTransferModal.vue:187 [Vue warn]: Unhandled error during execution of component event handler
  at <CategoryTransferModal key=0 is-open=true month= {key: '2025-4', label: 'April 2025', start: Tue Apr 01 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit), end: Wed Apr 30 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit)}  ... >
  at <BudgetMonthCard month= {key: '2025-4', label: 'April 2025', start: Tue Apr 01 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit), end: Wed Apr 30 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit)} categories= (9) [Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object)] >
  at <BudgetsView onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< Proxy(Object) {__v_skip: true} > key=0 >
  at <RouterView>
  at <AppLayout>
  at <App>
warn$1 @ chunk-U3LI7FBV.js?v=37377835:2116
logError @ chunk-U3LI7FBV.js?v=37377835:2327
handleError @ chunk-U3LI7FBV.js?v=37377835:2319
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2265
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2270
emit @ chunk-U3LI7FBV.js?v=37377835:8466
(anonymous) @ chunk-U3LI7FBV.js?v=37377835:10175
transferBetweenCategories @ CategoryTransferModal.vue:187
cache.<computed>.cache.<computed> @ chunk-U3LI7FBV.js?v=37377835:12160
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2270
invoker @ chunk-U3LI7FBV.js?v=37377835:11202
chunk-U3LI7FBV.js?v=37377835:2116 [Vue warn]: Unhandled error during execution of native event handler
  at <CategoryTransferModal key=0 is-open=true month= {key: '2025-4', label: 'April 2025', start: Tue Apr 01 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit), end: Wed Apr 30 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit)}  ... >
  at <BudgetMonthCard month= {key: '2025-4', label: 'April 2025', start: Tue Apr 01 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit), end: Wed Apr 30 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit)} categories= (9) [Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object)] >
  at <BudgetsView onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< Proxy(Object) {__v_skip: true} > key=0 >
  at <RouterView>
  at <AppLayout>
  at <App>
warn$1 @ chunk-U3LI7FBV.js?v=37377835:2116
logError @ chunk-U3LI7FBV.js?v=37377835:2327
handleError @ chunk-U3LI7FBV.js?v=37377835:2319
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2265
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2270
invoker @ chunk-U3LI7FBV.js?v=37377835:11202
chunk-U3LI7FBV.js?v=37377835:2332 Uncaught TypeError: Cannot create property 'value' on boolean 'true'
    at $setup.showTransferModal._createBlock.onTransfer._cache.<computed>._cache.<computed> (BudgetMonthCard.vue:636:274)
    at callWithErrorHandling (chunk-U3LI7FBV.js?v=37377835:2263:19)
    at callWithAsyncErrorHandling (chunk-U3LI7FBV.js?v=37377835:2270:17)
    at emit (chunk-U3LI7FBV.js?v=37377835:8466:5)
    at chunk-U3LI7FBV.js?v=37377835:10175:45
    at transferBetweenCategories (CategoryTransferModal.vue:187:3)
    at cache.<computed>.cache.<computed> (chunk-U3LI7FBV.js?v=37377835:12160:12)
    at callWithErrorHandling (chunk-U3LI7FBV.js?v=37377835:2263:19)
    at callWithAsyncErrorHandling (chunk-U3LI7FBV.js?v=37377835:2270:17)
    at HTMLFormElement.invoker (chunk-U3LI7FBV.js?v=37377835:11202:5)
$setup.showTransferModal._createBlock.onTransfer._cache.<computed>._cache.<computed> @ BudgetMonthCard.vue:636
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2270
emit @ chunk-U3LI7FBV.js?v=37377835:8466
(anonymous) @ chunk-U3LI7FBV.js?v=37377835:10175
transferBetweenCategories @ CategoryTransferModal.vue:187
cache.<computed>.cache.<computed> @ chunk-U3LI7FBV.js?v=37377835:12160
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2270
invoker @ chunk-U3LI7FBV.js?v=37377835:11202


Überprüfe, weshalb das Log Fehler wirft, wenn ich einen Kategorien Transfer im BudgetMonthCard vollziehe.
