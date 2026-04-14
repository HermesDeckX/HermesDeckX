const a="Rantai Model Fallback",n="Konfigurasi model fallback untuk beralih otomatis saat model utama tidak tersedia, memastikan operasi berkelanjutan",e={body:`## Mengapa Model Fallback?

Penyedia AI bisa tidak tersedia sementara (rate limit, gangguan, saldo kurang). Rantai fallback memungkinkan HermesAgent otomatis beralih ke model berikutnya.

## Konfigurasi di HermesDeckX

1. «Pusat Pengaturan → Model»
2. «Model Fallback» → «Tambah Model Fallback»
3. Pilih penyedia dan model
4. Tambahkan beberapa model berdasarkan prioritas

## Kombinasi Rekomendasi

| Model Utama | Fallback 1 | Fallback 2 |
|-------------|-----------|------------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**Best Practice:**
- **Penyedia berbeda** untuk utama dan fallback
- Fallback bisa level lebih murah
- Minimal 1 fallback, idealnya 2+

## Field Konfigurasi

Path: \`agents.defaults.model.fallbacks\`

\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},l={name:a,description:n,content:e};export{e as content,l as default,n as description,a as name};
