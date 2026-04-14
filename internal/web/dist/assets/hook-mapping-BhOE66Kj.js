const e="Mapeo de hook para GitHub PR",o="Fragmento de mapeo Webhook: convertir eventos de GitHub Pull Request en instrucciones de revisión de código AI",n={snippet:`hooks:
  - name: github-pr-review
    description: "Revisión automática de código al crear un GitHub PR"
    mapping: |
      Evento de GitHub Pull Request recibido:

      **Repositorio**: {{repository.full_name}}
      **Título**: {{pull_request.title}}
      **Autor**: {{pull_request.user.login}}
      **Descripción**: {{pull_request.body}}

      Por favor revise este PR:
      1. Verificar calidad del código y mejores prácticas
      2. Buscar bugs potenciales y problemas de seguridad
      3. Proporcionar sugerencias de mejora
      4. Dar retroalimentación amigable y constructiva`},i={name:e,description:o,content:n};export{n as content,i as default,o as description,e as name};
