const a="Saluran Terputus",n="Mengatasi masalah saluran pesan (Telegram, Discord, WhatsApp, dll.) yang terputus atau tidak bisa mengirim/menerima pesan",e={question:"Apa yang harus dilakukan jika saluran pesan terputus atau tidak bisa mengirim/menerima pesan?",answer:`## Langkah Penyelesaian

### 1. Periksa status saluran di dasbor
Buka dasbor HermesDeckX dan periksa indikator:
- 🟢 Terhubung — Normal
- 🔴 Terputus — Perlu perbaikan
- 🟡 Menghubungkan — Menunggu atau mencoba ulang

### 2. Periksa validitas token
Buka «Pusat Pengaturan → Saluran»:
- **Telegram** — Token mungkin telah direset oleh BotFather
- **Discord** — Token mungkin telah direset di Developer Portal
- **WhatsApp** — Sesi QR code mungkin kedaluwarsa, pindai ulang

### 3. Periksa koneksi jaringan
- Telegram dan Discord memerlukan akses ke server API
- WhatsApp menggunakan WebSocket, memerlukan jaringan stabil
- Di lingkungan proxy, verifikasi pengaturan

### 4. Periksa pengaturan saluran
- Pastikan \`enabled\` tidak diatur ke false
- Pastikan aturan \`allowFrom\` tidak memblokir secara keliru

### 5. Hubungkan kembali
- Klik «Hubungkan Ulang» di dasbor
- Atau simpan pengaturan untuk memicu koneksi ulang
- Upaya terakhir: restart gateway

## Perbaikan Cepat

Jalankan diagnostik di «Pusat Kesehatan» → Periksa channel.connected.`},i={name:a,description:n,content:e};export{e as content,i as default,n as description,a as name};
