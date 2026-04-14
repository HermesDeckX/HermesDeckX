const e="Setup Webhooks",n="Gunakan Webhooks untuk mengirim event eksternal (GitHub, alert, dll.) ke AI untuk diproses",o={body:`## Apa itu Hooks?

Hooks memungkinkan sistem eksternal mengirim event ke HermesAgent. AI dapat memprosesnya secara otomatis.

## Skenario Umum

| Skenario | Sumber | Pemrosesan AI |
|----------|--------|---------------|
| Code review | GitHub Webhook | AI review PR |
| Alert server | Monitoring | AI analisis dan notifikasi |
| Submit form | Form web | AI proses dan respons |

## Konfigurasi di HermesDeckX

1. «Pusat Pengaturan → Hooks»
2. «Tambah hook»
3. URL Webhook unik dibuat
4. Konfigurasi pemetaan
5. Masukkan URL di sistem eksternal`,steps:["Pusat Pengaturan → Hooks","Buat hook baru","Set template pemetaan","Salin URL Webhook","Konfigurasi di sistem eksternal"]},s={name:e,description:n,content:o};export{o as content,s as default,n as description,e as name};
