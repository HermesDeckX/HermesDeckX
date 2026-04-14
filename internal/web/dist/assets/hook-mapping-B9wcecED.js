const n="Маппинг хука GitHub PR",e="Фрагмент маппинга Webhook: преобразование событий GitHub Pull Request в инструкции для AI-ревью кода",t={snippet:`hooks:
  - name: github-pr-review
    description: "Автоматическое ревью кода при создании GitHub PR"
    mapping: |
      Получено событие GitHub Pull Request:

      **Репозиторий**: {{repository.full_name}}
      **Заголовок**: {{pull_request.title}}
      **Автор**: {{pull_request.user.login}}
      **Описание**: {{pull_request.body}}

      Пожалуйста, выполните ревью PR:
      1. Проверить качество кода и лучшие практики
      2. Найти потенциальные баги и проблемы безопасности
      3. Дать предложения по улучшению
      4. Предоставить дружелюбную и конструктивную обратную связь`},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
