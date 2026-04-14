const n="Tambah Penyedia AI",a="Konfigurasi kunci API dan opsi penyedia model AI seperti OpenAI, Anthropic, Google",e={body:`## Penyedia yang Didukung

| Penyedia | Contoh Model | Fitur |
|----------|-------------|-------|
| **OpenAI** | GPT-4o, GPT-4o-mini | Ekosistem paling matang |
| **Anthropic** | Claude Sonnet, Haiku | Keamanan tinggi, konteks panjang |
| **Google** | Gemini Pro, Flash | Multimodal, biaya rendah |
| **DeepSeek** | DeepSeek Chat, Coder | Nilai terbaik |
| **Ollama** | Llama, Mistral | Deploy lokal, gratis |

## Konfigurasi di HermesDeckX

1. «Pusat Pengaturan → Penyedia Model»
2. «Tambah Penyedia»
3. Pilih jenis dan masukkan kunci API
4. Pilih model
5. Simpan`,steps:["Pusat Pengaturan → Penyedia","Tambah penyedia","Jenis dan kunci API","Pilih model","Simpan"]},i={name:n,description:a,content:e};export{e as content,i as default,a as description,n as name};
