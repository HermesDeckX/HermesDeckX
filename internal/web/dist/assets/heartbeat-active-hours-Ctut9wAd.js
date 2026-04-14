const e="Plage horaire active du heartbeat",n="Configurer la plage horaire active du heartbeat AI — vérifier uniquement pendant les heures de travail, économiser des tokens la nuit et le week-end",t={body:`## Pourquoi configurer une plage horaire ?

Les tâches heartbeat consomment des tokens à chaque déclenchement. En fonctionnement 24h/24 :
- Gaspillage de tokens la nuit et le week-end
- Notifications intempestives
- Réduction de coûts de 50-70% possible

## Configurer dans HermesDeckX

« Centre de configuration → Planification → Plage horaire active » :

### Paramètres
- **activeHoursStart** — Heure de début (ex : "08:00")
- **activeHoursEnd** — Heure de fin (ex : "22:00")
- **timezone** — Fuseau horaire (ex : "Europe/Paris")

## Combinaison avec l'intervalle heartbeat

| Plage horaire | Intervalle | Déclenchements/jour | Coût |
|---------------|-----------|---------------------|------|
| 8:00-22:00 | 30 min | 28 | Moyen |
| 8:00-22:00 | 60 min | 14 | Faible |
| 9:00-18:00 | 60 min | 9 | Minimal |

## Champs de configuration

Chemins : \`heartbeat.activeHoursStart\`, \`heartbeat.activeHoursEnd\`, \`heartbeat.timezone\``},a={name:e,description:n,content:t};export{t as content,a as default,n as description,e as name};
