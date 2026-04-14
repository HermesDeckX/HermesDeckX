const e="Canal déconnecté",n="Résoudre les problèmes de canaux de messagerie (Telegram, Discord, WhatsApp, etc.) déconnectés ou ne pouvant pas envoyer/recevoir de messages",a={question:"Que faire si un canal de messagerie est déconnecté ou ne peut pas envoyer/recevoir de messages ?",answer:`## Étapes de résolution

### 1. Vérifier l'état du canal dans le tableau de bord
Ouvrez le tableau de bord HermesDeckX et vérifiez les indicateurs d'état dans la liste des canaux :
- 🟢 Connecté — Normal
- 🔴 Déconnecté — Nécessite une résolution
- 🟡 Connexion en cours — En attente ou nouvelle tentative

### 2. Vérifier la validité du Token
Allez dans « Centre de configuration → Canaux » et vérifiez le Token du canal :
- **Telegram** — Le Token a pu être réinitialisé par BotFather
- **Discord** — Le Token a pu être réinitialisé dans le Developer Portal
- **WhatsApp** — La session QR code a pu expirer, rescannez

### 3. Vérifier la connexion réseau
- Telegram et Discord nécessitent l'accès à leurs serveurs API
- WhatsApp utilise WebSocket, nécessite un réseau stable
- En environnement proxy, confirmez que la configuration est correcte

### 4. Vérifier la configuration du canal
- Confirmez que \`enabled\` n'est pas à false
- Confirmez que les règles \`allowFrom\` ne bloquent pas par erreur

### 5. Reconnecter
- Cliquez sur « Reconnecter » dans le tableau de bord
- Ou sauvegardez la configuration pour déclencher la reconnexion
- Dernier recours : redémarrer la passerelle

## Solution rapide

Lancez un diagnostic dans le « Centre de santé » → Vérifiez l'élément channel.connected.`},r={name:e,description:n,content:a};export{a as content,r as default,n as description,e as name};
