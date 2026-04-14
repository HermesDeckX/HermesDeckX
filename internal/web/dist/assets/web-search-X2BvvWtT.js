const a="Pencarian Web Lanjutan",n="Aktifkan pencarian web agar asisten AI mendapatkan informasi terkini secara real-time. Mendukung Brave, Perplexity, Gemini, Grok, Kimi",e={body:`## Mengapa Mengaktifkan Pencarian Web?

Model AI memiliki tanggal cutoff data pelatihan. Dengan pencarian web, asisten dapat:
- Mencari berita, cuaca, harga saham real-time
- Mencari dokumentasi teknis dan referensi API
- Memverifikasi akurasi pengetahuannya sendiri

## Penyedia Pencarian yang Didukung

| Penyedia | Fitur | Kunci API |
|----------|-------|----------|
| **Brave** | Privasi, kuota gratis | Diperlukan |
| **Perplexity** | Hasil ditingkatkan AI | Diperlukan |
| **Gemini** | Kemampuan Google Search | Diperlukan |
| **Grok** | Integrasi platform X | Diperlukan |
| **Kimi** | Dioptimalkan untuk Cina | Diperlukan |

## Konfigurasi di HermesDeckX

1. «Pusat Pengaturan → Tools»
2. Area «Pencarian Web»
3. Aktifkan sakelar
4. Pilih penyedia
5. Masukkan kunci API

## Parameter yang Dapat Disesuaikan

- **maxResults** — Maksimum hasil (default 5)
- **timeoutSeconds** — Batas waktu
- **cacheTtlMinutes** — Durasi cache

## Field Konfigurasi

Path: \`tools.web.search.enabled\` dan \`tools.web.search.provider\``},i={name:a,description:n,content:e};export{e as content,i as default,n as description,a as name};
