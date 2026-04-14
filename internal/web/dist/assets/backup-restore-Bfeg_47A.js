const e="Backup dan Restore",n="Backup konfigurasi, memori, dan riwayat percakapan HermesAgent, mendukung migrasi ke perangkat baru",a={body:`## Apa yang Di-backup

| Item | Path | Pentingnya |
|------|------|----------|
| Konfigurasi | \`~/.hermesdeckx/config.yaml\` | Wajib |
| Konfigurasi agen | \`~/.hermesdeckx/agents/\` | Wajib |
| File memori | \`~/.hermesdeckx/memory/\` | Penting |
| Riwayat sesi | \`~/.hermesdeckx/sessions/\` | Opsional |
| Kredensial | \`~/.hermesdeckx/credentials/\` | Penting |

## Metode Backup

### Metode 1: Manual
\`\`\`bash
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### Metode 2: CLI
\`\`\`bash
hermesagent config export > backup.yaml
\`\`\`

### Metode 3: Antarmuka HermesDeckX
«Ekspor Konfigurasi» di bagian bawah Pusat Pengaturan.

## Restore

1. Instal HermesAgent
2. Salin file ke \`~/.hermesdeckx/\`
3. Mulai gateway`,steps:["Tentukan lingkup backup","Lakukan backup","Simpan di tempat aman","Untuk restore, salin ke ~/.hermesdeckx/ dan restart"]},s={name:e,description:n,content:a};export{a as content,s as default,n as description,e as name};
