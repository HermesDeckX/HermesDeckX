const a="Emoji Status Pesan",n="Aktifkan reaksi emoji status agar pengguna melihat tahap pemrosesan AI secara real-time",e={body:`## Apa itu Emoji Status?

Reaksi status adalah emoji yang ditambahkan HermesAgent secara otomatis ke pesan pengguna selama pemrosesan.

## Emoji Status Default

| Tahap | Emoji | Arti |
|-------|-------|------|
| thinking | 🤔 | AI sedang berpikir |
| tool | 🔧 | AI menggunakan tool |
| coding | 💻 | AI menulis kode |
| web | 🌐 | AI mencari di web |
| done | ✅ | Pemrosesan selesai |
| error | ❌ | Error pemrosesan |

## Konfigurasi di HermesDeckX

«Pusat Pengaturan → Pesan» → «Emoji Status»:

1. Aktifkan sakelar
2. Kustomisasi emoji (opsional)
3. Sesuaikan parameter waktu (opsional)

## Parameter Waktu

- **debounceMs** — Delay debounce (default 500ms)
- **stallSoftMs** — Waktu «pemrosesan lambat» (default 30000ms)
- **stallHardMs** — Waktu «pemrosesan macet» (default 120000ms)

## Field Konfigurasi

Path: \`messages.statusReactions\``},s={name:a,description:n,content:e};export{e as content,s as default,n as description,a as name};
