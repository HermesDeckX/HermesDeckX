const e="Mapping hook GitHub PR",n="Snippet de mapping Webhook : convertir les événements GitHub Pull Request en instructions de revue de code AI",t={snippet:`hooks:
  - name: github-pr-review
    description: "Revue de code automatique à la création d'un PR GitHub"
    mapping: |
      Événement GitHub Pull Request reçu :

      **Dépôt** : {{repository.full_name}}
      **Titre** : {{pull_request.title}}
      **Auteur** : {{pull_request.user.login}}
      **Description** : {{pull_request.body}}

      Veuillez revoir ce PR :
      1. Vérifier la qualité du code et les bonnes pratiques
      2. Rechercher les bugs potentiels et problèmes de sécurité
      3. Fournir des suggestions d'amélioration
      4. Donner un retour constructif et bienveillant`},i={name:e,description:n,content:t};export{t as content,i as default,n as description,e as name};
