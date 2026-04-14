const e="Emojis de statut de message",t="Activer les réactions emoji de statut pour que les utilisateurs connaissent en temps réel l'étape de traitement de l'AI",n={body:`## Que sont les emojis de statut ?

Les réactions de statut sont des emojis ajoutés automatiquement par HermesAgent aux messages de l'utilisateur pendant le traitement.

## Emojis de statut par défaut

| Étape | Emoji | Signification |
|-------|-------|---------------|
| thinking | 🤔 | L'AI réfléchit |
| tool | 🔧 | L'AI utilise un outil |
| coding | 💻 | L'AI écrit du code |
| web | 🌐 | L'AI cherche sur le web |
| done | ✅ | Traitement terminé |
| error | ❌ | Erreur de traitement |

## Configurer dans HermesDeckX

« Centre de configuration → Messages » → zone « Emojis de statut » :

1. Activer l'interrupteur
2. Personnaliser les emojis (optionnel)
3. Ajuster les paramètres de temps (optionnel)

## Paramètres de temps

- **debounceMs** — Délai anti-rebond (défaut 500ms)
- **stallSoftMs** — Temps pour « traitement lent » (défaut 30000ms)
- **stallHardMs** — Temps pour « traitement bloqué » (défaut 120000ms)

## Champs de configuration

Chemin : \`messages.statusReactions\``},s={name:e,description:t,content:n};export{n as content,s as default,t as description,e as name};
