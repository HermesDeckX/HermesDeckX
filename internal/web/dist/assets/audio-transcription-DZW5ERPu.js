const n="Transkripsi Audio",a="Aktifkan transkripsi audio agar asisten AI memahami pesan suara. Mendukung Whisper, Groq, Gemini",i={body:`## Mengapa Mengaktifkan Transkripsi Audio?

Banyak platform chat mendukung pesan suara. Dengan transkripsi aktif, asisten AI dapat:
- Mengonversi pesan suara ke teks secara otomatis
- Memahami dan merespons konten suara
- Mendukung pengenalan suara multibahasa

## Penyedia yang Didukung

| Penyedia | Fitur | Biaya |
|----------|-------|-------|
| **OpenAI Whisper** | Akurasi tinggi, multibahasa | Per durasi |
| **Groq** | Sangat cepat | Per durasi |
| **Gemini** | Multimodal native | Per token |

## Konfigurasi di HermesDeckX

1. «Pusat Pengaturan → Tools»
2. Temukan area «Transkripsi Audio»
3. Aktifkan sakelar
4. Pilih penyedia
5. Pastikan kunci API terkonfigurasi

## Field Konfigurasi

Path: \`tools.audio.transcription\``},e={name:n,description:a,content:i};export{i as content,e as default,a as description,n as name};
