# Orrery kostenlos ins Netz bringen

Passt zu einer rein statischen Seite (eine HTML-Datei, kein Server, kein Build) – genau wie die Schwesterprojekte.

## Hosting: kostenlos über Git mit Cloudflare Pages

1. GitHub-Repository: `rworthmann2312/orrery`, Branch `main` – wird von Claude eingerichtet und gepusht.
2. Bei [Cloudflare Pages](https://pages.cloudflare.com/) mit GitHub einloggen und das Repo verbinden (Projektname z. B. `orrery`).
3. Build-Einstellungen: **Build-Befehl leer lassen** (kein `npm run build`, keine Abhängigkeiten), **Ausgabeordner (Build output directory): `public`**.
4. Danach: Jeder `git push` auf `main` veröffentlicht automatisch neu.
5. Die Seite ist dann über `https://orrery.pages.dev` erreichbar (oder den Namen, den du beim Verbinden vergibst).

**Warum dieser letzte Schritt nicht automatisch passiert ist:** Das Verbinden eines Cloudflare-Pages-Projekts mit einem GitHub-Repo läuft über das Cloudflare-Dashboard und einen OAuth-Login, für den es kein API-Token in dieser Umgebung gibt – das muss einmalig von Hand gemacht werden (dauert ca. 2 Minuten, siehe Schritt 2–3).

## Eigene Domain

Siehe `HOSTING.md` im Projekt `projekt-uniform-webseite` für die generelle Vorgehensweise (Registrar, Subdomain, Custom-Domain-Eintrag im Cloudflare-Dashboard).
