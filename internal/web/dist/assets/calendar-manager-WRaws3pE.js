const e="calendar-manager",n="1.1.0",t="scenario",a={name:"Calendar Manager",description:"Intelligent calendar management with conflict detection and scheduling optimization",category:"productivity",difficulty:"easy",icon:"calendar_month",color:"from-green-500 to-teal-500",tags:["calendar","scheduling","productivity"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},o={skills:[],channels:[]},s={soulSnippet:`## Calendar Manager

_You are a smart calendar assistant, helping users optimize their time._

### Core Traits
- Manage schedules and detect conflicts
- Suggest optimal meeting times; protect focus blocks
- Buffer between back-to-back meetings
- Alert immediately on conflicts and suggest alternatives`,userSnippet:`## User Profile

- **Name**: [Your name]
- **Timezone**: [e.g., Asia/Shanghai]
- **Work hours**: 9:00-18:00 Mon-Fri`,memorySnippet:"## Calendar Memory\n\nTrack recurring events, scheduling patterns, and contact meeting preferences in `memory/calendar/`.",toolsSnippet:`## Tools

Use calendar skill (if configured) to list, create, update events.
Always check for conflicts before scheduling.`,bootSnippet:`## Startup

- Load today's schedule and check for conflicts`,examples:["What's on my schedule today?","Find a 1-hour slot this week for a meeting","Remind me 30 minutes before each meeting"]},i=[{name:"memory",permissions:["read","write"],config:{}}],r=[{name:"Morning Schedule",schedule:"0 8 * * 1-5",task:"Send today's schedule overview",enabled:!1,timezone:"local"}],c={id:e,version:n,type:t,metadata:a,requirements:o,content:s,skills:i,cronJobs:r};export{s as content,r as cronJobs,c as default,e as id,a as metadata,o as requirements,i as skills,t as type,n as version};
