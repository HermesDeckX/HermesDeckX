const e="Gateway-TLS-Verschlüsselung",n="HTTPS/TLS-Verschlüsselung für das Gateway aktivieren — Fernzugriff und API-Kommunikation schützen",t={body:`## Wann wird TLS benötigt?

- Gateway-Zugriff außerhalb von localhost (LAN, öffentliches Netzwerk)
- Zugriff über Tailscale / VPN (empfohlen)
- Webhook-Endpunkte bereitstellen

## In HermesDeckX konfigurieren

« Einstellungszentrum → Gateway → TLS »:

### Methode 1: Auto-generiertes Zertifikat (einfachste)
- « Automatisches TLS » aktivieren
- Selbst-signiertes Zertifikat wird generiert
- Für persönliche Nutzung und interne Netzwerke

### Methode 2: Eigenes Zertifikat
- **cert** — Zertifikatsdatei (.pem)
- **key** — Privater Schlüssel (.pem)
- Für Produktion und öffentlichen Zugriff

### Methode 3: Reverse Proxy
- Nginx / Caddy übernimmt TLS
- Gateway nutzt intern HTTP

## Konfigurationsfelder

Pfad: \`gateway.tls\``},i={name:e,description:n,content:t};export{t as content,i as default,n as description,e as name};
