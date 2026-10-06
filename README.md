# Orrery

Ein Himmel, der klingt. Eine kleine generative Licht- und Klang-Installation im Browser: Du setzt leuchtende Himmelskörper in ein Nachtblau, sie ziehen sich gegenseitig sanft an, umkreisen sich, streifen aneinander vorbei und hinterlassen Lichtspuren wie Kometenschweife. Jede nahe Begegnung löst einen weichen Ton aus einer A-Moll-Pentatonik aus – die Tonhöhe richtet sich nach der Position am Himmel, die Klangfarbe nach der "Art" des Körpers. Dazu ein leiser Drone-Teppich und ein simples Feedback-Delay als Hallraum. So entsteht eine sich selbst spielende, nie exakt wiederholende Ambient-Komposition.

Keine Biologie, kein Lernspiel – ein eigenständiges, rein spielerisches Projekt.

## Modi

- **Freies Spiel** – beliebig viele Körper setzen, volle gegenseitige Anziehung, der Himmel entwickelt sich frei weiter.
- **Konstellationen** – 100 vorgegebene Formen (Vielecke, Sterne, Gitter, Wellen, Spiralen, Sonnen, Doppelringe, Buchstaben, Zickzack und unregelmäßige Sternbild-Cluster) mit möglichst wenigen Körpern nachbilden, nach Punktanzahl aufsteigend sortiert. Fortschritt wird pro Level gespeichert.
- **Kaminmodus** – ein rein passiver Himmel: alle paar Sekunden erscheint von selbst ein warmer Körper, du musst nichts tun. Zum Zurücklehnen und Zuschauen.
- **Regennacht** – wie Freies Spiel, aber mit sanftem, fallendem Regen (visuell und akustisch) für eine kühlere, ruhigere Stimmung.
- **Sternenfolge** – Merkspiel: sechs Sterne leuchten in einer Reihenfolge auf, die mit jeder Runde um einen Stern wächst. Nachtippen, so lange es geht. Bestleistung wird gespeichert.
- **Sternenfänger** – Reflex-Mini-Spiel: 45 Sekunden lang aufblitzende Sterne einfangen, bevor sie verglühen. Bestleistung wird gespeichert.

## Bedienung

- **Klick / Tippen** setzt einen neuen Körper.
- **Ziehen** gibt ihm beim Loslassen Schwung in Zugrichtung mit.
- **Rechtsklick** (bzw. langes Drücken auf Touch) entfernt den nächstgelegenen Körper.
- **Leertaste** schaltet den Klang an/aus.
- **S** speichert den aktuellen Himmel als PNG.
- **Esc** öffnet die Pause bzw. geht einen Schritt zurück.
- **H** zeigt die Steuerung noch einmal an.

## Erfolge & Fortschritt

Zehn Erfolge (z. B. für die erste Konstellation, 250 ausgelöste Klänge oder 20 gesehene Sternschnuppen), dazu Einstellungen für Lautstärke, Sterndichte und reduzierte Bewegung. Alles liegt versioniert in `localStorage` und lässt sich über "Fortschritt zurücksetzen" in den Einstellungen komplett löschen.

## Technik

Abhängigkeitsfreie Module unter `public/js/` (natives ES-Modul-System, kein Build-Schritt, kein Framework): `audio.js` (Web-Audio-Engine), `sim.js` (Physik/Konstellationen), `achievements.js`, `save.js`, `constellations.js`, `ui.js` und `main.js` als Einstiegspunkt. Styles in `public/css/style.css`.

Lokal ansehen:

```bash
cd public
python3 -m http.server 8787
```

Dann `http://localhost:8787` öffnen.

## Hosting

Siehe [`HOSTING.md`](HOSTING.md).
