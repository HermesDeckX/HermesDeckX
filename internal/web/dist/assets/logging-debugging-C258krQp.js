const n="Logging dan Debugging",a="Konfigurasi level log, format output, dan tool diagnostik untuk menyelesaikan masalah HermesAgent secara efisien",e={body:`## Konfigurasi Logging

«Pusat Pengaturan → Logging»:

### Level Log

| Level | Deskripsi | Skenario |
|-------|-----------|----------|
| **silent** | Tanpa output | Tidak direkomendasikan |
| **error** | Hanya error | Produksi |
| **warn** | Error + peringatan | Produksi (direkomendasikan) |
| **info** | Info runtime | Penggunaan harian (default) |
| **debug** | Info debug | Sementara saat ada masalah |
| **trace** | Paling detail | Debugging mendalam |

### Format Output Konsol

- **pretty** — Format berwarna (pengembangan)
- **compact** — Output ringkas (produksi)
- **json** — Format JSON (sistem pengumpulan log)

## Field Konfigurasi

Path: \`logging\` dan \`diagnostics\``},o={name:n,description:a,content:e};export{e as content,o as default,a as description,n as name};
