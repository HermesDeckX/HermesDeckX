const n="Penguatan Keamanan",a="Konfigurasi keamanan komprehensif — kontrol akses, pembatasan tool, kebijakan jaringan, dan enkripsi",e={body:`## Checklist Konfigurasi Keamanan

### 1. Aktifkan autentikasi
- Mode \`token\` (direkomendasikan) atau \`password\`
- **Wajib untuk akses di luar localhost**

### 2. Konfigurasi enkripsi TLS
- Aktifkan TLS untuk akses eksternal

### 3. Batasi akses saluran
Per saluran:
- **allowFrom** — Hanya ID pengguna tertentu
- **dmPolicy** — Batasi DM
- **groupPolicy** — Kontrol respons grup

### 4. Batasi izin tool
- Profil sesuai (\`full\` / \`coding\` / \`messaging\` / \`minimal\`)
- Daftar deny untuk tool berbahaya
- exec allowlist untuk perintah

### 5. Aktifkan sandbox
- Docker sandbox untuk eksekusi kode
- Workspace pada \`ro\`

## Level Keamanan Rekomendasi

| Level | Skenario | Konfigurasi |
|-------|----------|-------------|
| **Dasar** | Pribadi, lokal | Default |
| **Standar** | LAN / Tailscale | Auth + allowFrom |
| **Tinggi** | Jaringan publik | Auth + TLS + allowFrom + sandbox + pembatasan |

## Field Konfigurasi

Path: \`gateway.auth\`, \`gateway.tls\`, \`channels[].allowFrom\`, \`tools.profile\`, \`agents.defaults.sandbox\``},o={name:n,description:a,content:e};export{e as content,o as default,a as description,n as name};
