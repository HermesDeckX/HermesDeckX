const a="Jam Aktif Heartbeat",n="Konfigurasi jam aktif heartbeat AI — periksa hanya saat jam kerja, hemat token di malam hari dan akhir pekan",e={body:`## Mengapa Konfigurasi Jam Aktif?

Tugas heartbeat mengonsumsi token setiap kali dipicu. Beroperasi 24/7:
- Pemborosan token di malam hari dan akhir pekan
- Notifikasi yang tidak diinginkan
- Penghematan biaya 50-70% dimungkinkan

## Konfigurasi di HermesDeckX

«Pusat Pengaturan → Penjadwalan → Jam Aktif»:

### Parameter
- **activeHoursStart** — Waktu mulai (misal "08:00")
- **activeHoursEnd** — Waktu selesai (misal "22:00")
- **timezone** — Zona waktu (misal "Asia/Jakarta")

## Kombinasi dengan Interval Heartbeat

| Jam Aktif | Interval | Pemicu/hari | Biaya |
|-----------|----------|-------------|-------|
| 8:00-22:00 | 30 menit | 28 | Sedang |
| 8:00-22:00 | 60 menit | 14 | Rendah |
| 9:00-18:00 | 60 menit | 9 | Minimal |

## Field Konfigurasi

Path: \`heartbeat.activeHoursStart\`, \`heartbeat.activeHoursEnd\`, \`heartbeat.timezone\``},i={name:a,description:n,content:e};export{e as content,i as default,n as description,a as name};
