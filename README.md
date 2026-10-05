# Orrery

Ein Himmel, der klingt. Eine kleine generative Licht- und Klang-Installation im Browser: Du setzt leuchtende Himmelskörper in ein Nachtblau, sie ziehen sich gegenseitig sanft an, umkreisen sich, streifen aneinander vorbei und hinterlassen Lichtspuren wie Kometenschweife. Jede nahe Begegnung löst einen weichen Ton aus einer A-Moll-Pentatonik aus – die Tonhöhe richtet sich nach der Position am Himmel, die Klangfarbe nach der "Art" des Körpers. Dazu ein leiser Drone-Teppich und ein simples Feedback-Delay als Hallraum. So entsteht eine sich selbst spielende, nie exakt wiederholende Ambient-Komposition.

Keine Biologie, kein Lernspiel – ein eigenständiges, rein spielerisches Projekt.

## Bedienung

- **Klick** setzt einen neuen Körper.
- **Ziehen** gibt ihm beim Loslassen Schwung in Zugrichtung mit.
- **Rechtsklick** (bzw. langes Drücken auf Touch) entfernt den nächstgelegenen Körper.
- **Leertaste** pausiert/setzt die Zeit fort.
- **?** zeigt die Steuerung noch einmal an.
- Die drei Icons oben rechts: Hilfe, Vollbild, Himmel als PNG speichern.

Der zuletzt gesehene Himmel wird automatisch im Browser gemerkt (`localStorage`) und beim nächsten Besuch wiederhergestellt.

## Technik

Eine einzige, abhängigkeitsfreie Datei: `public/index.html` (Canvas 2D + Web Audio API, kein Build-Schritt, kein Framework). Lokal ansehen:

```bash
cd public
python3 -m http.server 8787
```

Dann `http://localhost:8787` öffnen.

## Hosting

Siehe [`HOSTING.md`](HOSTING.md).
