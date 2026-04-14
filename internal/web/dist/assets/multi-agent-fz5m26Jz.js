const n="Kolaborasi Multi-Agen",a="Gunakan agen berbeda untuk skenario berbeda, masing-masing dengan kepribadian, memori, dan kemampuan independen",e={body:`## Apa itu Multi-Agen?

Multi-agen memungkinkan pembuatan beberapa karakter AI independen. Setiap Agent memiliki:

- **IDENTITY.md** — Identitas dan kepribadian independen
- **SOUL.md** — Aturan perilaku independen
- **MEMORY/** — Sistem memori independen
- **Kemampuan** — Konfigurasi kemampuan independen

## Skenario Penggunaan

| Skenario | Contoh Agent |
|----------|-------------|
| Kerja vs pribadi | «Asisten kerja» untuk email dan kode, «Asisten pribadi» untuk jadwal |
| Indonesia vs Inggris | Satu Agent berbahasa Indonesia, satu berbahasa Inggris |
| Proyek berbeda | Satu Agent per proyek, terisolasi sepenuhnya |
| Berbagi tim | Agent khusus per anggota tim |

## Konfigurasi

### 1. Buat Agent baru
«Pusat Pengaturan → Agen → Tambah Agen»

### 2. Tetapkan saluran
Setiap Agent dapat dihubungkan ke saluran berbeda.

### 3. Konfigurasi independen
IDENTITY.md, SOUL.md, dan kemampuan independen per Agent.

## Lanjutan: Kolaborasi Antar Agent

- **Memori bersama** — File memori antar agen
- **Routing pesan** — Penugasan otomatis ke Agent yang tepat
- **Workflow** — Agen berkolaborasi langkah demi langkah

## Best Practice

- Mulai dengan 2 agen, perluas bertahap
- Diferensiasi peran jelas di IDENTITY.md
- Gunakan panel «Manajemen Multi-Agen» di HermesDeckX`},i={name:n,description:a,content:e};export{e as content,i as default,a as description,n as name};
