const a="Setup Tugas Terjadwal",n="Gunakan tugas heartbeat agar AI secara otomatis melakukan pengecekan, mengirim ringkasan, dan melakukan pemeliharaan",e={body:`## Apa itu Heartbeat?

Heartbeat adalah sistem tugas terjadwal HermesAgent:
- Kirim ringkasan berita harian
- Periksa email setiap jam
- Buat laporan mingguan

## Konfigurasi di HermesDeckX

«Pusat Pengaturan → Penjadwalan»:

- **enabled** — Aktifkan heartbeat
- **intervalMinutes** — Interval eksekusi
- **model** — Model ekonomis direkomendasikan

### Jam aktif
- **activeHoursStart/End** — misal 8:00-22:00
- **timezone** — Zona waktu`,steps:["Pusat Pengaturan → Penjadwalan","Aktifkan heartbeat","Atur interval dan waktu","Pilih model","Tulis instruksi","Simpan"]},t={name:a,description:n,content:e};export{e as content,t as default,n as description,a as name};
