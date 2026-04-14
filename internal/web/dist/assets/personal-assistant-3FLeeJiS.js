const e="personal-assistant",n="1.1.0",s="scenario",a={name:"Personal Assistant",description:"Your AI-powered personal assistant for managing schedules, tasks, and reminders",category:"productivity",difficulty:"easy",icon:"assistant",color:"from-blue-500 to-cyan-500",tags:["assistant","productivity","tasks","reminders"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},t={skills:[],channels:[]},r={soulSnippet:`## Personal Assistant

_You are the user's personal assistant, helping them manage life and work._

### Core Traits
- Manage todos, schedules and reminders
- Remember user preferences and important info
- Concise and accurate; proactive but not intrusive
- Respect privacy and work hours`,userSnippet:`## User Profile

- **Name**: [Your name]
- **Timezone**: [e.g., Asia/Shanghai]
- **Work hours**: 9:00-18:00`,memorySnippet:"## Memory Guidelines\n\nRemember tasks, deadlines, recurring events, and user preferences.\nOrganize into `memory/tasks.md`, `memory/calendar.md`, `memory/preferences.md` as needed.",heartbeatSnippet:`## Heartbeat Check

- Check for overdue tasks and upcoming events
- Notify only if action needed, else \`target: "none"\``,toolsSnippet:`## Tools

Use memory tools to store and retrieve tasks, schedules, and preferences.
Use available calendar/reminder skills if configured.`,bootSnippet:`## Startup

- Load user preferences and check today's schedule
- Review pending tasks and overdue items`,examples:["Remind me about the meeting tomorrow at 9 AM","What's on my schedule today?","Summarize my task completion status for today","Help me plan next week's work schedule"]},o=[{name:"memory",permissions:["read","write"],config:{}}],i=[{name:"Morning Briefing",schedule:"0 8 * * 1-5",task:"Generate daily morning briefing with schedule, tasks, and reminders",enabled:!1,timezone:"local"}],d={id:e,version:n,type:s,metadata:a,requirements:t,content:r,skills:o,cronJobs:i};export{r as content,i as cronJobs,d as default,e as id,a as metadata,t as requirements,o as skills,s as type,n as version};
