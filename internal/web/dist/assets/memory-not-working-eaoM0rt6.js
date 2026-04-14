const e="Fonction mémoire défaillante",n="Résoudre les problèmes lorsque l'assistant AI ne peut pas se souvenir du contenu des conversations précédentes ou des préférences utilisateur",s={question:"Que faire si l'assistant AI ne se souvient pas du contenu des conversations précédentes ?",answer:`## Comprendre le mécanisme de mémoire

Le système de mémoire d'HermesAgent comporte deux niveaux :
1. **Mémoire de session** — Contexte de la conversation actuelle (gestion automatique)
2. **Mémoire persistante** — Information conservée entre les sessions (fichier MEMORY.md)

## Étapes de résolution

### 1. Vérifier l'état de la session
- Si une réinitialisation a eu lieu récemment, l'historique est effacé
- Vérifier si la réinitialisation automatique est activée
- Vérifier les paramètres de compression

### 2. Vérifier la configuration de mémoire persistante
Allez dans « Centre de configuration → Agent » :
- Confirmez que l'outil \`memory\` est activé
- Vérifiez que MEMORY.md existe et contient des données
- Confirmez que \`memoryFlush\` est activé

### 3. Problèmes courants

**L'AI a oublié les préférences** :
- Dites explicitement « Souviens-toi : j'aime X »
- L'AI l'écrira dans MEMORY.md
- Lors de la prochaine conversation, l'AI chargera ce fichier

**Sensation de conversation discontinue** :
- La compression peut être trop agressive
- Augmentez la valeur de \`compaction.threshold\`

## Champs de configuration

Chemins associés : \`agents.defaults.compaction\`, \`tools.memory\``},i={name:e,description:n,content:s};export{s as content,i as default,n as description,e as name};
