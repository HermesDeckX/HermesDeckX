const a="Optimasi Biaya",n="Kurangi biaya penggunaan AI secara komprehensif — pemilihan model, kompresi, heartbeat, dan strategi tool",e={body:`## Checklist Optimasi Biaya

### 1. Pilih model yang tepat
- Harian: GPT-4o-mini / Claude Haiku / Gemini Flash
- Tugas kompleks: GPT-4o / Claude Sonnet
- Jangan gunakan model termahal sebagai default

### 2. Aktifkan kompresi
- Threshold 30000-50000
- Aktifkan memoryFlush

### 3. Optimalkan heartbeat
- Model termurah untuk heartbeat
- Tingkatkan interval (30-60 menit)
- Konfigurasi jam aktif

### 4. Strategi sub-agen
- Model murah untuk sub-agen
- Batasi kedalaman dan jumlah

### 5. Kontrol tool
- Profil \`minimal\` atau \`messaging\`
- Nonaktifkan tool yang tidak diperlukan

### 6. Manajemen sesi
- Auto-reset harian
- \`/compact\` berkala

## Field Konfigurasi

Path: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\`, \`tools.profile\``},t={name:a,description:n,content:e};export{e as content,t as default,n as description,a as name};
