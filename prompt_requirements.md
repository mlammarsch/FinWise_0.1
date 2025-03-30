Beim klicken auf einen Dropdown Eintrag in der BudgetMonthCard kommt:
main.ts:21 <Suspense> is an experimental feature and its API will likely change.
BudgetMonthCard.vue:222 [Vue warn]: Unhandled error during execution of render function
  at <BudgetMonthCard month= {key: '2025-3', label: 'März 2025', start: Sat Mar 01 2025 01:00:00 GMT+0100 (Mitteleuropäische Normalzeit), end: Mon Mar 31 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit)} categories= (11) [Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object)] expanded= Set(0) {size: 0} >
  at <BudgetsView onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< Proxy(Object) {__v_skip: true} > key=0 >
  at <RouterView>
  at <AppLayout>
  at <App>
warn$1 @ chunk-U3LI7FBV.js?v=37377835:2116
logError @ chunk-U3LI7FBV.js?v=37377835:2327
handleError @ chunk-U3LI7FBV.js?v=37377835:2319
renderComponentRoot @ chunk-U3LI7FBV.js?v=37377835:8617
componentUpdateFn @ chunk-U3LI7FBV.js?v=37377835:7481
run @ chunk-U3LI7FBV.js?v=37377835:481
runIfDirty @ chunk-U3LI7FBV.js?v=37377835:519
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2263
flushJobs @ chunk-U3LI7FBV.js?v=37377835:2471
Promise.then
queueFlush @ chunk-U3LI7FBV.js?v=37377835:2385
queueJob @ chunk-U3LI7FBV.js?v=37377835:2380
effect2.scheduler @ chunk-U3LI7FBV.js?v=37377835:7532
trigger @ chunk-U3LI7FBV.js?v=37377835:509
endBatch @ chunk-U3LI7FBV.js?v=37377835:567
notify @ chunk-U3LI7FBV.js?v=37377835:827
trigger @ chunk-U3LI7FBV.js?v=37377835:801
set value @ chunk-U3LI7FBV.js?v=37377835:1673
optionFill @ BudgetMonthCard.vue:222
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2270
invoker @ chunk-U3LI7FBV.js?v=37377835:11202
BudgetMonthCard.vue:222 [Vue warn]: Unhandled error during execution of component update
  at <BudgetMonthCard month= {key: '2025-3', label: 'März 2025', start: Sat Mar 01 2025 01:00:00 GMT+0100 (Mitteleuropäische Normalzeit), end: Mon Mar 31 2025 02:00:00 GMT+0200 (Mitteleuropäische Sommerzeit)} categories= (11) [Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object), Proxy(Object)] expanded= Set(0) {size: 0} >
  at <BudgetsView onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< Proxy(Object) {__v_skip: true} > key=0 >
  at <RouterView>
  at <AppLayout>
  at <App>
warn$1 @ chunk-U3LI7FBV.js?v=37377835:2116
logError @ chunk-U3LI7FBV.js?v=37377835:2327
handleError @ chunk-U3LI7FBV.js?v=37377835:2319
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2265
flushJobs @ chunk-U3LI7FBV.js?v=37377835:2471
Promise.then
queueFlush @ chunk-U3LI7FBV.js?v=37377835:2385
queueJob @ chunk-U3LI7FBV.js?v=37377835:2380
effect2.scheduler @ chunk-U3LI7FBV.js?v=37377835:7532
trigger @ chunk-U3LI7FBV.js?v=37377835:509
endBatch @ chunk-U3LI7FBV.js?v=37377835:567
notify @ chunk-U3LI7FBV.js?v=37377835:827
trigger @ chunk-U3LI7FBV.js?v=37377835:801
set value @ chunk-U3LI7FBV.js?v=37377835:1673
optionFill @ BudgetMonthCard.vue:222
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2270
invoker @ chunk-U3LI7FBV.js?v=37377835:11202
BudgetMonthCard.vue:531 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'mode')
    at Proxy._sfc_render (BudgetMonthCard.vue:531:28)
    at renderComponentRoot (chunk-U3LI7FBV.js?v=37377835:8581:17)
    at ReactiveEffect.componentUpdateFn [as fn] (chunk-U3LI7FBV.js?v=37377835:7481:26)
    at ReactiveEffect.run (chunk-U3LI7FBV.js?v=37377835:481:19)
    at ReactiveEffect.runIfDirty (chunk-U3LI7FBV.js?v=37377835:519:12)
    at callWithErrorHandling (chunk-U3LI7FBV.js?v=37377835:2263:33)
    at flushJobs (chunk-U3LI7FBV.js?v=37377835:2471:9)
_sfc_render @ BudgetMonthCard.vue:531
renderComponentRoot @ chunk-U3LI7FBV.js?v=37377835:8581
componentUpdateFn @ chunk-U3LI7FBV.js?v=37377835:7481
run @ chunk-U3LI7FBV.js?v=37377835:481
runIfDirty @ chunk-U3LI7FBV.js?v=37377835:519
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2263
flushJobs @ chunk-U3LI7FBV.js?v=37377835:2471
Promise.then
queueFlush @ chunk-U3LI7FBV.js?v=37377835:2385
queueJob @ chunk-U3LI7FBV.js?v=37377835:2380
effect2.scheduler @ chunk-U3LI7FBV.js?v=37377835:7532
trigger @ chunk-U3LI7FBV.js?v=37377835:509
endBatch @ chunk-U3LI7FBV.js?v=37377835:567
notify @ chunk-U3LI7FBV.js?v=37377835:827
trigger @ chunk-U3LI7FBV.js?v=37377835:801
set value @ chunk-U3LI7FBV.js?v=37377835:1673
optionFill @ BudgetMonthCard.vue:222
callWithErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=37377835:2270
invoker @ chunk-U3LI7FBV.js?v=37377835:11202
