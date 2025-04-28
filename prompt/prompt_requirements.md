Fehlermeldung beim Login

client:495 [vite] connecting...
client:618 [vite] connected.
main.ts:39 <Suspense> is an experimental feature and its API will likely change.
login:1 [DOM] Password field is not contained in a form: (More info: https://goo.gl/9p2vKq) <input type=​"password" placeholder=​"Passwort" class=​"input input-bordered w-full" autocomplete=​"current-password">​flex
logger.ts:48 [INFO ][SessionService] Router-Guards aktiviert
chunk-U3LI7FBV.js?v=c6ff928c:11196 [Violation] 'click' handler took 3202ms
register:1 [DOM] Password field is not contained in a form: (More info: https://goo.gl/9p2vKq) <input type=​"password" placeholder=​"Passwort" class=​"input input-bordered w-full" autocomplete=​"new-password">​flex
register:1 [DOM] Password field is not contained in a form: (More info: https://goo.gl/9p2vKq) <input type=​"password" placeholder=​"Passwort wiederholen" class=​"input input-bordered w-full" autocomplete=​"new-password">​flex
login:1 [DOM] Password field is not contained in a form: (More info: https://goo.gl/9p2vKq) <input type=​"password" placeholder=​"Passwort" class=​"input input-bordered w-full" autocomplete=​"current-password">​flex
logger.ts:48 [INFO ][UserService] Login erfolgreich {userId: '196fedbe-e069-45af-869c-c641b06aedd3'}

Danach läuft der Loginprozess und hört nicht mehr auf. Kein Timeout. Ich komme nicht an die Konsole ran.
Ich habe einen User registriert, mit dem ich mich einloggen wollte um einen Tenant anzulegen. Nur noch ein weißer Bildschirm ohne Infos. Da läuft was ins leere.
