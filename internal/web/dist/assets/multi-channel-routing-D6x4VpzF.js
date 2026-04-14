const a="Routing Multi-Saluran",n="Layani beberapa platform chat dengan satu AI, dengan aturan perilaku berbeda per saluran",e={body:`## Apa itu Routing Multi-Saluran?

Routing multi-saluran menghubungkan asisten AI secara bersamaan ke Telegram, Discord, WhatsApp, Signal, dll., dengan **aturan independen per saluran**.

## Mengapa?

- **Manajemen terpadu** — Satu AI untuk semua platform
- **Perilaku berbeda** — Saluran kerja formal, pribadi santai
- **Kontrol akses** — allowFrom dan dmPolicy berbeda per saluran

## Konfigurasi

### 1. Tambah beberapa saluran
Tambah platform dan masukkan token.

### 2. Konfigurasi aturan routing
Setiap saluran dikonfigurasi secara independen:
- **dmPolicy** — Siapa yang bisa memulai DM (\`open\` / \`allowlist\` / \`closed\`)
- **allowFrom** — Daftar putih
- **groupPolicy** — Strategi respons grup

### 3. Override SOUL per saluran
Setiap saluran bisa memiliki SOUL.md sendiri.

## Field Konfigurasi

Path: \`channels[].dmPolicy\`, \`channels[].allowFrom\`, \`channels[].groupPolicy\``},r={name:a,description:n,content:e};export{e as content,r as default,n as description,a as name};
