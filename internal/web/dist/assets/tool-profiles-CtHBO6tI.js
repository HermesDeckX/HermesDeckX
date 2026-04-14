const n="Profil Izin Tool",a="Kontrol tool yang tersedia untuk AI melalui profil — seimbangkan kemampuan dan keamanan",i={body:`## Profil Tool

HermesAgent menyediakan 4 profil preset:

| Profil | Deskripsi | Skenario |
|--------|-----------|----------|
| **full** | Semua tool (default) | Pribadi, lingkungan tepercaya |
| **coding** | Kode, perintah, file | Asisten programming |
| **messaging** | Pesan, percakapan dasar | Hanya chat |
| **minimal** | Izin minimal | Keamanan tinggi |

## Konfigurasi di HermesDeckX

1. «Pusat Pengaturan → Tools»
2. Pilih profil dari dropdown
3. Untuk kontrol lebih detail, gunakan daftar allow/deny

## Kontrol Izin Detail

- **deny** — Tool yang secara eksplisit dilarang
- **allow** — Hanya tool yang diizinkan (override profil)
- **alsoAllow** — Tool tambahan yang diizinkan
- **byProvider** — Izin berbeda per penyedia

## Field Konfigurasi

Path: \`tools.profile\`

Nilai: \`minimal\` | \`coding\` | \`messaging\` | \`full\``},o={name:n,description:a,content:i};export{i as content,o as default,a as description,n as name};
