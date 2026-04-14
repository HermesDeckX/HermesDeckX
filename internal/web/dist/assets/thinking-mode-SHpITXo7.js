const n="Mode Berpikir",a="Aktifkan pemikiran mendalam untuk meningkatkan kemampuan penalaran kompleks — tingkatkan kualitas dalam matematika, pemrograman, dan analisis",i={body:`## Apa itu Mode Berpikir?

Mode berpikir (pemikiran diperluas, rantai pemikiran) memungkinkan AI «berpikir langkah demi langkah» sebelum menjawab.

## Kapan Menggunakan?

| Jenis Tugas | Direkomendasikan? |
|-------------|-------------------|
| Matematika/logika kompleks | ✅ Ya |
| Pemrograman multi-langkah | ✅ Ya |
| Analisis data | ✅ Ya |
| Q&A sederhana | ❌ Tidak (pemborosan token) |
| Percakapan harian | ❌ Tidak |

## Konfigurasi di HermesDeckX

### Mode Default
- **thinkingDefault**
  - \`off\` — Tanpa pemikiran (default)
  - \`minimal\` — Pemikiran singkat
  - \`full\` — Pemikiran diperluas penuh

### Beralih Per Percakapan
- \`/think\` — Aktifkan untuk pesan berikutnya
- \`/think off\` — Nonaktifkan

## Dampak Biaya

- **Pemikiran singkat:** ~20-50% token tambahan
- **Pemikiran penuh:** ~50-200% token tambahan

## Field Konfigurasi

Path: \`agents.defaults.thinkingDefault\``},e={name:n,description:a,content:i};export{i as content,e as default,a as description,n as name};
