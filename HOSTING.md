# Orrery kostenlos ins Netz bringen

Passt zu einer rein statischen Seite (eine HTML-Datei, kein Server, kein Build) – genau wie die Schwesterprojekte.

## Hosting: kostenlos über Git mit Cloudflare Pages

**Erledigt (2026-10-05):** GitHub-Repository `rworthmann2312/orrery` (Branch `main`) ist mit Cloudflare Pages verbunden (Projekt `orrery`, Build-Befehl leer, Ausgabeordner `public`). Jeder `git push` auf `main` veröffentlicht automatisch neu.

- **Live-Adresse:** <https://orrery-1i4.pages.dev> (der Name `orrery.pages.dev` war auf Cloudflare bereits von einem anderen Konto vergeben, daher der Zusatz `-1i4`).
- Das Verbinden lief über das Cloudflare-Dashboard: GitHub-App-Zugriff auf das Repo `orrery` freigeschaltet (unter github.com/settings/installations, App "Cloudflare Workers and Pages"), danach "Import an existing Git repository" → Repo wählen → Build-Befehl leer, Ausgabeordner `public` → Deploy.

## Eigene Domain

Siehe `HOSTING.md` im Projekt `projekt-uniform-webseite` für die generelle Vorgehensweise (Registrar, Subdomain, Custom-Domain-Eintrag im Cloudflare-Dashboard).
