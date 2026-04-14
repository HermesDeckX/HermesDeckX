const n="Multi-Agent Collaboration",e="Use different Agents for different scenarios, each with independent personality, memory and skill configuration",t={body:`## What is Multi-Agent?

Multi-Agent lets you create multiple independent AI roles, each Agent having its own:

- **IDENTITY.md** — Independent identity and personality
- **SOUL.md** — Independent behavior rules
- **MEMORY/** — Independent memory system
- **Skills** — Independent skill configuration

## Use Cases

| Scenario | Agent Examples |
|----------|---------------|
| Work vs Life | "Work Assistant" handles emails and code, "Life Assistant" manages schedule and shopping |
| Chinese vs English | One Agent in Chinese, another in English |
| Different Projects | One Agent per project, completely isolated memory and context |
| Team Sharing | Each team member gets their own dedicated Agent |

## Configuration Method

### 1. Create New Agent

In Config Center → Agent → New Agent, set name and emoji.

### 2. Assign Channels

Each Agent can bind to different channels, e.g.:
- Work Agent → Slack
- Life Agent → Telegram

### 3. Independent Configuration

Configure independent IDENTITY.md, SOUL.md and skills for each Agent.

## Advanced: Inter-Agent Collaboration

Multiple Agents can collaborate through:

- **Shared Memory** — Some memory files can be shared across Agents
- **Message Routing** — Auto-assign messages to the appropriate Agent based on content
- **Workflows** — Multiple Agents collaborating step-by-step to complete complex tasks

## Best Practices

- Start with 2 Agents (e.g., work + life) and gradually expand
- Each Agent's IDENTITY.md should have clear role differentiation
- Use HermesDeckX's "Multi-Agent Management" panel for unified management`},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
