Schau Dir mal beim Öffnen der Planning View den Fehler in der Console an:
main.ts:21 <Suspense> is an experimental feature and its API will likely change.
chunk-U3LI7FBV.js?v=f2a2ae5d:2116 [Vue warn]: Unhandled error during execution of render function
  at <PlanningView onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< null > key=0 >
  at <RouterView>
  at <AppLayout>
  at <App>
warn$1 @ chunk-U3LI7FBV.js?v=f2a2ae5d:2116
logError @ chunk-U3LI7FBV.js?v=f2a2ae5d:2327
handleError @ chunk-U3LI7FBV.js?v=f2a2ae5d:2319
renderComponentRoot @ chunk-U3LI7FBV.js?v=f2a2ae5d:8617
componentUpdateFn @ chunk-U3LI7FBV.js?v=f2a2ae5d:7403
run @ chunk-U3LI7FBV.js?v=f2a2ae5d:481
setupRenderEffect @ chunk-U3LI7FBV.js?v=f2a2ae5d:7538
mountComponent @ chunk-U3LI7FBV.js?v=f2a2ae5d:7313
processComponent @ chunk-U3LI7FBV.js?v=f2a2ae5d:7266
patch @ chunk-U3LI7FBV.js?v=f2a2ae5d:6782
componentUpdateFn @ chunk-U3LI7FBV.js?v=f2a2ae5d:7490
run @ chunk-U3LI7FBV.js?v=f2a2ae5d:481
runIfDirty @ chunk-U3LI7FBV.js?v=f2a2ae5d:519
callWithErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2263
flushJobs @ chunk-U3LI7FBV.js?v=f2a2ae5d:2471
Promise.then
queueFlush @ chunk-U3LI7FBV.js?v=f2a2ae5d:2385
queueJob @ chunk-U3LI7FBV.js?v=f2a2ae5d:2380
effect2.scheduler @ chunk-U3LI7FBV.js?v=f2a2ae5d:7532
trigger @ chunk-U3LI7FBV.js?v=f2a2ae5d:509
endBatch @ chunk-U3LI7FBV.js?v=f2a2ae5d:567
notify @ chunk-U3LI7FBV.js?v=f2a2ae5d:827
trigger @ chunk-U3LI7FBV.js?v=f2a2ae5d:801
set value @ chunk-U3LI7FBV.js?v=f2a2ae5d:1673
finalizeNavigation @ vue-router.js?v=f2a2ae5d:2517
(anonymous) @ vue-router.js?v=f2a2ae5d:2427
Promise.then
pushWithRedirect @ vue-router.js?v=f2a2ae5d:2395
push @ vue-router.js?v=f2a2ae5d:2321
navigate @ vue-router.js?v=f2a2ae5d:1550
callWithErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2270
invoker @ chunk-U3LI7FBV.js?v=f2a2ae5d:11202
chunk-U3LI7FBV.js?v=f2a2ae5d:2116 [Vue warn]: Unhandled error during execution of component update
  at <RouterView>
  at <AppLayout>
  at <App>
warn$1 @ chunk-U3LI7FBV.js?v=f2a2ae5d:2116
logError @ chunk-U3LI7FBV.js?v=f2a2ae5d:2327
handleError @ chunk-U3LI7FBV.js?v=f2a2ae5d:2319
callWithErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2265
flushJobs @ chunk-U3LI7FBV.js?v=f2a2ae5d:2471
Promise.then
queueFlush @ chunk-U3LI7FBV.js?v=f2a2ae5d:2385
queueJob @ chunk-U3LI7FBV.js?v=f2a2ae5d:2380
effect2.scheduler @ chunk-U3LI7FBV.js?v=f2a2ae5d:7532
trigger @ chunk-U3LI7FBV.js?v=f2a2ae5d:509
endBatch @ chunk-U3LI7FBV.js?v=f2a2ae5d:567
notify @ chunk-U3LI7FBV.js?v=f2a2ae5d:827
trigger @ chunk-U3LI7FBV.js?v=f2a2ae5d:801
set value @ chunk-U3LI7FBV.js?v=f2a2ae5d:1673
finalizeNavigation @ vue-router.js?v=f2a2ae5d:2517
(anonymous) @ vue-router.js?v=f2a2ae5d:2427
Promise.then
pushWithRedirect @ vue-router.js?v=f2a2ae5d:2395
push @ vue-router.js?v=f2a2ae5d:2321
navigate @ vue-router.js?v=f2a2ae5d:1550
callWithErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2270
invoker @ chunk-U3LI7FBV.js?v=f2a2ae5d:11202
planningStore.ts:88 Uncaught (in promise) TypeError: adjustedDate.isSameOrAfter is not a function
    at calculateNextOccurrences (planningStore.ts:88:24)
    at planningStore.ts:45:31
    at Array.forEach (<anonymous>)
    at Proxy.<anonymous> (planningStore.ts:44:10)
    at ComputedRefImpl.fn (PlanningView.vue:52:17)
    at refreshComputed (chunk-U3LI7FBV.js?v=f2a2ae5d:636:29)
    at get value (chunk-U3LI7FBV.js?v=f2a2ae5d:1828:5)
    at unref (chunk-U3LI7FBV.js?v=f2a2ae5d:1701:30)
    at Object.get (chunk-U3LI7FBV.js?v=f2a2ae5d:1707:64)
    at PlanningView.vue:203:17
calculateNextOccurrences @ planningStore.ts:88
(anonymous) @ planningStore.ts:45
(anonymous) @ planningStore.ts:44
(anonymous) @ PlanningView.vue:52
refreshComputed @ chunk-U3LI7FBV.js?v=f2a2ae5d:636
get value @ chunk-U3LI7FBV.js?v=f2a2ae5d:1828
unref @ chunk-U3LI7FBV.js?v=f2a2ae5d:1701
get @ chunk-U3LI7FBV.js?v=f2a2ae5d:1707
(anonymous) @ PlanningView.vue:203
renderList @ chunk-U3LI7FBV.js?v=f2a2ae5d:4988
_sfc_render @ PlanningView.vue:1
renderComponentRoot @ chunk-U3LI7FBV.js?v=f2a2ae5d:8581
componentUpdateFn @ chunk-U3LI7FBV.js?v=f2a2ae5d:7403
run @ chunk-U3LI7FBV.js?v=f2a2ae5d:481
setupRenderEffect @ chunk-U3LI7FBV.js?v=f2a2ae5d:7538
mountComponent @ chunk-U3LI7FBV.js?v=f2a2ae5d:7313
processComponent @ chunk-U3LI7FBV.js?v=f2a2ae5d:7266
patch @ chunk-U3LI7FBV.js?v=f2a2ae5d:6782
componentUpdateFn @ chunk-U3LI7FBV.js?v=f2a2ae5d:7490
run @ chunk-U3LI7FBV.js?v=f2a2ae5d:481
runIfDirty @ chunk-U3LI7FBV.js?v=f2a2ae5d:519
callWithErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2263
flushJobs @ chunk-U3LI7FBV.js?v=f2a2ae5d:2471
Promise.then
queueFlush @ chunk-U3LI7FBV.js?v=f2a2ae5d:2385
queueJob @ chunk-U3LI7FBV.js?v=f2a2ae5d:2380
effect2.scheduler @ chunk-U3LI7FBV.js?v=f2a2ae5d:7532
trigger @ chunk-U3LI7FBV.js?v=f2a2ae5d:509
endBatch @ chunk-U3LI7FBV.js?v=f2a2ae5d:567
notify @ chunk-U3LI7FBV.js?v=f2a2ae5d:827
trigger @ chunk-U3LI7FBV.js?v=f2a2ae5d:801
set value @ chunk-U3LI7FBV.js?v=f2a2ae5d:1673
finalizeNavigation @ vue-router.js?v=f2a2ae5d:2517
(anonymous) @ vue-router.js?v=f2a2ae5d:2427
Promise.then
pushWithRedirect @ vue-router.js?v=f2a2ae5d:2395
push @ vue-router.js?v=f2a2ae5d:2321
navigate @ vue-router.js?v=f2a2ae5d:1550
callWithErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2263
callWithAsyncErrorHandling @ chunk-U3LI7FBV.js?v=f2a2ae5d:2270
invoker @ chunk-U3LI7FBV.js?v=f2a2ae5d:11202
