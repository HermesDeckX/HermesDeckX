const n="Eksekusi Kode Sandbox",a="Aktifkan Docker sandbox untuk eksekusi kode AI yang aman — isolasi sistem file dan akses jaringan",e={body:`## Apa itu Mode Sandbox?

Mode sandbox menjalankan kode yang dihasilkan AI dalam container Docker terisolasi, mencegah modifikasi langsung file host atau permintaan jaringan tidak sah.

## Mengapa Sandbox?

Tanpa sandbox, AI dapat:
- Memodifikasi atau menghapus file sistem
- Menjalankan perintah sembarangan
- Mengakses data sensitif

Dengan sandbox:
- Kode berjalan di container terisolasi
- Akses file terkontrol (none / ro / rw)
- Akses jaringan dibatasi
- Penggunaan sumber daya terbatas

## Konfigurasi di HermesDeckX

«Pusat Pengaturan → Agen → Sandbox»:

1. Aktifkan sandbox
2. Pilih jenis: \`docker\` (direkomendasikan) atau \`podman\`
3. Konfigurasi image Docker
4. Atur mode akses workspace

## Mode Akses Workspace

| Mode | Deskripsi |
|------|----------|
| **none** | Tanpa akses ke file host |
| **ro** | Hanya baca |
| **rw** | Baca dan tulis |

## Field Konfigurasi

Path: \`agents.defaults.sandbox\``},s={name:n,description:a,content:e};export{e as content,s as default,a as description,n as name};
