const e="Pemetaan Hook GitHub PR",n="Snippet pemetaan Webhook: konversi event GitHub Pull Request menjadi instruksi code review AI",a={snippet:`hooks:
  - name: github-pr-review
    description: "Code review otomatis saat GitHub PR dibuat"
    mapping: |
      Event GitHub Pull Request diterima:

      **Repository**: {{repository.full_name}}
      **Judul**: {{pull_request.title}}
      **Penulis**: {{pull_request.user.login}}
      **Deskripsi**: {{pull_request.body}}

      Silakan review PR ini:
      1. Periksa kualitas kode dan best practice
      2. Cari bug potensial dan masalah keamanan
      3. Berikan saran perbaikan
      4. Berikan feedback yang ramah dan konstruktif`},i={name:e,description:n,content:a};export{a as content,i as default,n as description,e as name};
