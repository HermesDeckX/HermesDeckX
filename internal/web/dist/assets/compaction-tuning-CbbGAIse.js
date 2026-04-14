const n="Penyesuaian Kompresi",a="Sesuaikan parameter kompresi percakapan — seimbangkan retensi konteks dan biaya token",e={body:`## Apa itu Kompresi Percakapan?

Saat riwayat menjadi terlalu panjang, kompresi secara otomatis mengondensi riwayat menjadi ringkasan, mempertahankan informasi penting sambil mengurangi konsumsi token.

## Konfigurasi di HermesDeckX

«Pusat Pengaturan → Agen → Kompresi»:

### Parameter Utama

- **threshold** — Ambang token untuk memicu kompresi (default 50000)
  - Terlalu kecil: kompresi sering, risiko kehilangan konteks
  - Terlalu besar: konsumsi tinggi, respons lebih lambat
  - Rekomendasi: 30000-80000

- **maxOutputTokens** — Panjang maksimum ringkasan
  - Rekomendasi: 20-30% dari threshold

### Memory Flush

- **memoryFlush** — Simpan info penting ke MEMORY.md secara otomatis
  - Sangat direkomendasikan

### Strategi Kompresi

- \`summarize\` — Buat ringkasan (default, paling efektif)
- \`truncate\` — Potong pesan lama (lebih cepat tapi kehilangan info)

## Pengaturan Rekomendasi

**Percakapan harian**: threshold=50000, memoryFlush=true
**Proyek programming**: threshold=80000, memoryFlush=true
**Hemat biaya**: threshold=30000, memoryFlush=true

## Field Konfigurasi

Path: \`agents.defaults.compaction\``},i={name:n,description:a,content:e};export{e as content,i as default,a as description,n as name};
