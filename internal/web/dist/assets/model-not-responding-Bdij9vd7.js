const e="Modèle ne répond pas",n="Résoudre les problèmes lorsque le modèle AI ne répond pas ou expire — vérifier clé API, quota et réseau",o={question:"Que faire si le modèle AI ne répond pas ou expire ?",answer:`## Étapes de résolution

### 1. Vérifier la clé API
Allez dans « Centre de configuration → Fournisseurs de modèles » :
- Confirmez que la clé API est saisie et correcte
- Confirmez qu'elle n'a pas expiré ou été révoquée
- Essayez de régénérer la clé dans la console du fournisseur

### 2. Vérifier le quota et le solde
- **OpenAI** — Vérifiez la page d'utilisation sur platform.openai.com
- **Anthropic** — Vérifiez l'utilisation sur console.anthropic.com
- **Google** — Vérifiez le quota API dans Cloud Console

### 3. Vérifier la disponibilité du modèle
- Confirmez l'orthographe du nom du modèle
- Certains modèles nécessitent des permissions spéciales
- Essayez un autre modèle

### 4. Vérifier la connexion réseau
- Confirmez l'accès au point de terminaison API
- Si proxy, vérifiez la configuration

### 5. Utiliser un modèle de repli
- Configurez une chaîne de modèles de repli

## Solution rapide

Lancez un diagnostic → Vérifiez model.reachable.`},i={name:e,description:n,content:o};export{o as content,i as default,n as description,e as name};
