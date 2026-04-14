const n="Auto-Reset Sesi",a="Konfigurasi auto-reset sesi harian/mingguan untuk mencegah pertumbuhan konteks tanpa batas dan peningkatan biaya",e={body:`## Mengapa Auto-Reset?

Tanpa reset:
- Konteks tumbuh tanpa batas
- Informasi lama mengencerkan kualitas
- Biaya terus meningkat

## Konfigurasi di HermesDeckX

«Pusat Pengaturan → Sesi → Auto-Reset»:

### Parameter
- **enabled** — Aktifkan
- **every** — Interval
  - \`24h\` — Harian (direkomendasikan)
  - \`12h\` — Dua kali sehari
  - \`7d\` — Mingguan
- **at** — Waktu (misal "04:00")
- **timezone** — Zona waktu

### Pertahankan Info Penting
- **keepMemory** — Pertahankan MEMORY.md setelah reset
- Aktifkan \`memoryFlush\` di pengaturan kompresi

## Field Konfigurasi

Path: \`session.autoReset\``},t={name:n,description:a,content:e};export{e as content,t as default,a as description,n as name};
