1) Wir passen nun einige Admin Formulare an. Der Master bezgl. dem Design ist der src\views\admin\AdminRecipientsView.vue. Das Aussehen der Tabelle, der Neu erstellenknopf in der Searchgroup. Die Pagingkomponente, das Design der Tabelle. Alles muss auf folgende DIaloge übernommen werden. Das betrifft nicht das Tabellenfelder Layout. Das ist natürlich spezifisch der Datenstruktur. Aber das Gesamtbild der Website sollte sich untereinander ähneln. Die Responsivegröße dabei auf Größe LG beschränken. Breiter sollten die Tabellen nicht werden.
Betroffene Ansichten:
src\views\admin\AdminPlanningView.vue
src\views\admin\AdminRulesView.vue

Die Ansicht: src\views\admin\AdminCategoriesView.vue soll das Layout von src\views\admin\AdminAccountsView.vue bekommen. Hier aber auch die Dateninhalte original beibehalten. Nur Layoutstruktur mit Buttons und Rahmen beachten.

2) In der Settingsview die Cards auch alle so umrahmen wie in den ganzen Adminviews.
3) In der SettingsView habe ich das Problem, dass die History nicht befüllt wird. Bitte füge in der Seite eine DokuCard als eine Art Legende ein, die erklärt, was genau eingestellt werden muss, dass die History loggt. Oder müssen andere Funktionen angepasst werden.
4) Entferne die Designeinstellung und Standardwährung. Ich wüsste nicht, dass wir Währungsunterschiede haben?
5) Füge auch im TAB Entwicklereinstellungen in der Settings eine Legenden Card ein, die erklärt, was die Logkategorien bedeuten. Sind diese schon aktiv?
6. Gib eine Doku aus, die ich als Systemprompt einstellen kann, was den logger.ts angeht. Bei zukünftigen Updates der Programmierungen soll der sofort richtig umgesetzt werden.
7. In der TransactionView und der PlaningView sind die Pagingelemente nicht mehr mit dem Design vergleichbar, wie es in der src\views\admin\AdminRecipientsView.vue der Fall ist. Das Margin oder Padding nach unten istfehlerhaft und die TableCard schneidet genau mit Unterkante ab, anstelle etwas Abstand zu halten.
8. Gestalte das Select bei "Einträge pro Seite" in den Paging Komponenten im Design genau gleich wie bei den Searchselect Dropdowns in der Filterleiste der TransactionList oder View. Fullrounded und border base-300.
