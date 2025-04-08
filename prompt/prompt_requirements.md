1. In der Komponente src\components\ui\SelectAccount.vue ist es wichtig, wenn die Komponente erstmals den Fokus erhält, dass sie beim Klicken auf den Dropdownbutton erst mal alle Einträge zeigt (minus der vorab deaktivierten Optionen). An der Stelle die Suchbegriffsverbindung entfernen. Erst wenn man in der Select tippt und das Wort darin überschreibt, soll die Suche starten. Dieses Verhalten muss auch in der SelectRecipient und SelectCategory noch nachgezogen werden. Außerdem müssen die Selects, sobald sie den Fokus erhalten, immer den Dateninhalt komplett markieren. Das ist modernes UX, damit man sofort lostippen kann, ohne löschen zu müssen. Mach auch ein Icon rein, dass den Inhalt per Klick löscht. Siehe in der SearchGroup das Template:
<!-- Wrapper um Input + Icon -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Suche..."
          class="input join-item rounded-l-full input-sm input-bordered border-1 border-base-300 text-center pr-8"
          @keyup="triggerSearch"
          @focus="selectAll"
        />
        <!-- X Icon im Feld -->
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-base text-neutral/60 hover:text-error/60"
        >
          <Icon icon="mdi:close-circle-outline" />
        </button>
      </div>
2. In der TransactionForm sollten die beiden Konto Selects ebenso mit der SelectAccount ausgestattet werden. Achtung, die Regeln beachten, welche Konten wann sichtbar sind. Außerdem auch darauf achten, beim Bearbeiten einer Transaktion muss aus dem zu bearbeitenden Datensatz das richtige Konto schon in der SelectAccount stehen.
3. Gleiches wie unter 2. gilt in selber Form (TransationForm) für Recipient und Kategorie.
4. Bei den Komponenten SelectAccount und SelectRecipient fehlt noch die Tastennavigation, wie sie in der SelectCategory funktioniert. Bitte diese Funktionalität in den beiden Komponenten nachbauen.
5. In der Komponente SelectAccount eine 2. Spalte rechts anbringen mit den aktuellen Kontoständen (ohne Prognosebuchungen). Auch das ist in der SelectCategory realisiert. Bitte übernehmen.
6. Ich möchte in anstehenden Buchungen bei Endloswiederholungen von Planbuchungen die Buchungen für 2 Jahre im Voraus sichtbar haben. Im Augenblick hört die anstehenden Buchungen Übersicht am Ende des laufenden Monats schon auf. Für ordentliche Kontoprognosen möchte ich gut 2 Jahre in die Zukunft schauen können. Der Planungssald der Konten muss entsprechend kumuliert aufgerechnet werden beginnend mit dem aktuellen realen Saldo des Kontos.
7. In der src\components\planning\PlanningTransactionForm.vue sollen hier:
<div v-if="upcomingDates.length > 0">
          <div class="text-sm font-semibold mb-2">Kommende Termine:</div>
          <div class="grid grid-cols-1 gap-2">
            <div
              v-for="(date, index) in upcomingDates"
              :key="index"
              class="text-sm"
            >
              {{ date.date }} ({{ date.day }})
            </div>
          </div>
        </div>
        maximal die kommenden 6 Buchungen beispielhaft gelistet sein.

8. Wenn eine Planbuchung automatisch ausgeführt wird, aktualisieren sich nicht die Accountview, TransacionList. Außerdem wird auch nicht die Anstehende Buchung entfernt, die ja schließlich ausgeführt ist. Nach etwa 1 min verschwindet die Planbuchung wenigstens. Aber mit dem Aktualisieren der Transactionslistenbereiche, da passiert nichts. Bitte prüfen, ob da noch ein Bug vorliegt. Ich habe den Code schon analysieren lassen. Es wird gesagt, die Listen würden sich aktualisieren. Irgendwie tut es das nicht.
