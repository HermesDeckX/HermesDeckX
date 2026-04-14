const a="Fungsi Memori Tidak Bekerja",n="Mengatasi masalah asisten AI yang tidak bisa mengingat konten percakapan sebelumnya atau preferensi pengguna",e={question:"Apa yang harus dilakukan jika asisten AI tidak mengingat percakapan sebelumnya?",answer:`## Pahami Mekanisme Memori

Sistem memori HermesAgent memiliki dua tingkat:
1. **Memori sesi** — Konteks percakapan saat ini (manajemen otomatis)
2. **Memori persisten** — Informasi tersimpan antar sesi (file MEMORY.md)

## Langkah Penyelesaian

### 1. Periksa status sesi
- Jika baru-baru ini direset, riwayat telah dihapus
- Periksa apakah auto-reset aktif
- Periksa pengaturan kompresi

### 2. Periksa pengaturan memori persisten
- Apakah tool \`memory\` aktif?
- Apakah MEMORY.md ada dan berisi konten?
- Apakah \`memoryFlush\` aktif?

### 3. Masalah umum

**AI lupa preferensi**: Katakan «Ingat: saya suka X»

**Percakapan terasa terputus**: Tingkatkan \`compaction.threshold\`

## Field Konfigurasi

Path: \`agents.defaults.compaction\`, \`tools.memory\``},i={name:a,description:n,content:e};export{e as content,i as default,n as description,a as name};
