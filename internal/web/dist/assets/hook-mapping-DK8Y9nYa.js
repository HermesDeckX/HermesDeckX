const e="Mapeamento de hook GitHub PR",o="Snippet de mapeamento Webhook: converter eventos de GitHub Pull Request em instruções de code review para a AI",n={snippet:`hooks:
  - name: github-pr-review
    description: "Code review automático ao criar PR no GitHub"
    mapping: |
      Evento de GitHub Pull Request recebido:

      **Repositório**: {{repository.full_name}}
      **Título**: {{pull_request.title}}
      **Autor**: {{pull_request.user.login}}
      **Descrição**: {{pull_request.body}}

      Por favor, revise este PR:
      1. Verificar qualidade do código e boas práticas
      2. Procurar bugs potenciais e problemas de segurança
      3. Fornecer sugestões de melhoria
      4. Dar feedback amigável e construtivo`},t={name:e,description:o,content:n};export{n as content,t as default,o as description,e as name};
