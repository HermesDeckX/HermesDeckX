const n="Enkripsi TLS Gateway",a="Aktifkan enkripsi HTTPS/TLS untuk gateway — lindungi akses jarak jauh dan komunikasi API",e={body:`## Kapan TLS Diperlukan?

- Akses gateway dari luar localhost (LAN, jaringan publik)
- Akses melalui Tailscale / VPN (direkomendasikan)
- Menyediakan endpoint Webhook

## Konfigurasi di HermesDeckX

«Pusat Pengaturan → Gateway → TLS»:

### Metode 1: Sertifikat otomatis (paling mudah)
- Aktifkan «TLS Otomatis»
- Sertifikat self-signed dibuat otomatis
- Untuk penggunaan pribadi dan jaringan internal

### Metode 2: Sertifikat kustom
- **cert** — File sertifikat (.pem)
- **key** — File kunci privat (.pem)
- Untuk produksi dan akses publik

### Metode 3: Reverse proxy
- Nginx / Caddy menangani TLS
- Gateway menggunakan HTTP secara internal

## Field Konfigurasi

Path: \`gateway.tls\``},i={name:n,description:a,content:e};export{e as content,i as default,a as description,n as name};
