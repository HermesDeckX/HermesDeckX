const a="Pemilihan Model Sub-Agen",n="Gunakan model lebih murah untuk sub-agen, mengurangi biaya secara signifikan sambil menjaga kualitas agen utama",e={body:`## Apa itu Sub-Agen?

Saat tugas kompleks, agen utama dapat membuat sub-agen untuk memproses sub-tugas secara paralel. Setiap sub-agen adalah panggilan AI independen.

## Masalah Biaya

Jika sub-agen menggunakan model mahal yang sama:
- 3-5 sub-agen di tugas kompleks
- Masing-masing mengonsumsi token dengan harga penuh
- Total biaya berlipat ganda dengan cepat

## Solusi: Model Lebih Murah untuk Sub-Agen

«Pusat Pengaturan → Agen → Sub-Agen»:
- **model** — Model lebih murah (gpt-4o-mini, claude-haiku, gemini-flash)
- **maxSpawnDepth** — Batasi kedalaman (rekomendasi: 1-2)
- **maxConcurrent** — Maksimum sub-agen bersamaan

## Kombinasi Rekomendasi

| Model Utama | Model Sub-Agen | Penghematan |
|-------------|----------------|-------------|
| claude-opus | claude-haiku | ~90% |
| gpt-4.5 | gpt-4o-mini | ~95% |
| gpt-4o | gpt-4o-mini | ~80% |
| gemini-pro | gemini-flash | ~85% |

## Field Konfigurasi

Path: \`agents.defaults.subagents\``},i={name:a,description:n,content:e};export{e as content,i as default,n as description,a as name};
