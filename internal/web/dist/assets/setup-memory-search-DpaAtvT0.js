const n="Setup Pencarian Memori",a="Aktifkan pencarian semantik memori agar AI bisa mencari percakapan lama dan pengetahuan tersimpan",i={body:`## Apa itu Pencarian Memori?

Pencarian memori memungkinkan AI menemukan informasi relevan dalam file memori historis.

## Konfigurasi di HermesDeckX

«Pusat Pengaturan → Tools»:

### 1. Aktifkan tool memori
- Tool «Memori» harus aktif

### 2. Aktifkan pencarian memori
- Aktifkan sakelar «Pencarian Memori»
- Pilih penyedia pencarian

### 3. Konfigurasi indexing
- **autoIndex** — Index file baru secara otomatis
- **indexOnBoot** — Re-index saat boot
- **maxResults** — Maksimum hasil`,steps:["Pusat Pengaturan → Tools","Aktifkan tool memori","Aktifkan pencarian memori","Konfigurasi indexing","Simpan"]},e={name:n,description:a,content:i};export{i as content,e as default,a as description,n as name};
