const e="GitHub PR Hook-Mapping",n="Webhook-Mapping-Snippet: GitHub Pull Request Ereignisse in AI Code-Review-Anweisungen umwandeln",i={snippet:`hooks:
  - name: github-pr-review
    description: "Automatisches Code-Review bei GitHub PR-Erstellung"
    mapping: |
      GitHub Pull Request Ereignis empfangen:

      **Repository**: {{repository.full_name}}
      **Titel**: {{pull_request.title}}
      **Autor**: {{pull_request.user.login}}
      **Beschreibung**: {{pull_request.body}}

      Bitte reviewen Sie diesen PR:
      1. Code-Qualität und Best Practices prüfen
      2. Potenzielle Bugs und Sicherheitsprobleme suchen
      3. Verbesserungsvorschläge geben
      4. Freundliches, konstruktives Feedback geben`},t={name:e,description:n,content:i};export{i as content,t as default,n as description,e as name};
