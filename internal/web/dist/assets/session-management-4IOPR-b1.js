const n="Manajemen Sesi",e="Konfigurasi lingkup sesi, auto-reset, dan strategi pemeliharaan untuk meningkatkan kontinuitas percakapan",a={body:`## Apa itu Sesi?

Sesi adalah rangkaian konteks percakapan yang berkelanjutan. HermesAgent memelihara riwayat dalam sesi.

## Lingkup Sesi

| Lingkup | Deskripsi |
|---------|----------|
| **channel** | Satu sesi per saluran (semua pengguna berbagi konteks) |
| **user** | Satu sesi per pengguna (konteks independen) |
| **thread** | Satu sesi per thread (paling granular) |

## Auto-Reset

- **enabled** — Aktifkan
- **every** — Interval ("24h", "7d")
- **keepMemory** — Pertahankan MEMORY.md setelah reset

## Perintah Sesi

- \`/reset\` — Reset manual
- \`/compact\` — Picu kompresi
- \`/session\` — Lihat info sesi

## Field Konfigurasi

Path: \`session.scope\`, \`session.autoReset\`, \`session.maintenance\``},s={name:n,description:e,content:a};export{a as content,s as default,e as description,n as name};
