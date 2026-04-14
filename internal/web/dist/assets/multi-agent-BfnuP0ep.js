const n="Collaboration multi-agents",e="Utiliser différents agents pour différents scénarios, chacun avec personnalité, mémoire et compétences indépendantes",t={body:`## Qu'est-ce que le multi-agents ?

Le multi-agents permet de créer plusieurs personnages AI indépendants. Chaque Agent possède :

- **IDENTITY.md** — Identité et personnalité indépendantes
- **SOUL.md** — Règles de comportement indépendantes
- **MEMORY/** — Système de mémoire indépendant
- **Compétences** — Configuration de compétences indépendante

## Scénarios d'utilisation

| Scénario | Exemple d'Agent |
|----------|----------------|
| Travail vs personnel | « Assistant travail » pour emails et code, « Assistant personnel » pour agenda et courses |
| Français vs anglais | Un Agent en français, un autre en anglais |
| Différents projets | Un Agent par projet, mémoire et contexte totalement isolés |
| Équipe partagée | Un Agent dédié par membre de l'équipe |

## Configuration

### 1. Créer un nouvel Agent
Dans « Centre de configuration → Agents → Ajouter un agent », configurez le nom et l'emoji.

### 2. Assigner des canaux
Chaque Agent peut être lié à différents canaux.

### 3. Configuration indépendante
Configurez IDENTITY.md, SOUL.md et compétences indépendantes pour chaque Agent.

## Avancé : Collaboration entre Agents

- **Mémoire partagée** — Certains fichiers mémoire peuvent être partagés
- **Routage de messages** — Attribution automatique au bon Agent
- **Workflow** — Plusieurs Agents collaborent étape par étape

## Bonnes pratiques

- Commencer avec 2 Agents, puis étendre
- Différenciation claire des rôles dans IDENTITY.md
- Utiliser le panneau « Gestion multi-agents » de HermesDeckX`},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
