const e="Colaboración multi-agente",n="Usar diferentes agentes para diferentes escenarios, cada uno con personalidad, memoria y habilidades independientes",a={body:`## ¿Qué es multi-agente?

Multi-agente permite crear múltiples personajes AI independientes. Cada Agent tiene:

- **IDENTITY.md** — Identidad y personalidad independiente
- **SOUL.md** — Reglas de comportamiento independientes
- **MEMORY/** — Sistema de memoria independiente
- **Habilidades** — Configuración de habilidades independiente

## Escenarios de uso

| Escenario | Ejemplo de Agent |
|-----------|------------------|
| Trabajo vs personal | «Asistente de trabajo» para emails y código, «Asistente personal» para agenda y compras |
| Español vs inglés | Un Agent en español, otro en inglés |
| Diferentes proyectos | Un Agent por proyecto, memoria y contexto totalmente aislados |
| Equipo compartido | Un Agent dedicado por miembro del equipo |

## Configuración

### 1. Crear nuevo Agent
En «Centro de configuración → Agentes → Agregar agente», configure nombre y emoji.

### 2. Asignar canales
Cada Agent puede vincularse a diferentes canales:
- Agent de trabajo → Slack
- Agent personal → Telegram

### 3. Configuración independiente
Configure IDENTITY.md, SOUL.md y habilidades independientes para cada Agent.

## Avanzado: Colaboración entre Agents

- **Memoria compartida** — Algunos archivos de memoria pueden compartirse entre Agents
- **Enrutamiento de mensajes** — Asignación automática al Agent apropiado según contenido
- **Flujo de trabajo** — Múltiples Agents colaboran paso a paso en tareas complejas

## Mejores prácticas

- Comenzar con 2 Agents (ej. trabajo + personal), expandir gradualmente
- Cada Agent debe tener diferenciación clara de rol en su IDENTITY.md
- Usar el panel «Gestión multi-agente» de HermesDeckX para gestión unificada`},i={name:e,description:n,content:a};export{a as content,i as default,n as description,e as name};
