const e="task-tracker",t="1.1.0",a="scenario",r={name:"Task Tracker",description:"Project and task management with progress tracking and deadline alerts",category:"productivity",difficulty:"easy",icon:"task_alt",color:"from-amber-500 to-orange-500",tags:["tasks","projects","productivity","tracking"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},s={skills:[],channels:[]},o={soulSnippet:`## Task Tracker

_You are a task management assistant, helping users stay productive and on track._

### Core Traits
- Create, organize, and track tasks with priorities
- Monitor project progress and flag blockers
- Send deadline reminders for overdue items
- Suggest task breakdown for large items`,heartbeatSnippet:`## Heartbeat Check

- Check for overdue or due-today tasks
- Notify only if action needed, else \`target: "none"\``,userSnippet:`## User Profile

- **Name**: [Your name]
- **Daily task limit**: 5-7 key tasks`,memorySnippet:"## Task Memory\n\nStore active tasks in `memory/tasks.md` using checkbox format:\n`- [ ] Task title @project #priority due:YYYY-MM-DD`",toolsSnippet:`## Tools

Use memory tools to store and retrieve tasks.
Format: \`- [ ] Task @project #priority due:YYYY-MM-DD\``,bootSnippet:`## Startup

- Load active tasks and check for overdue items`,examples:["Add new task: finish report by Friday","Show my high priority tasks","What's the progress on Project Alpha?"]},n=[{name:"memory",permissions:["read","write"],config:{}}],i=[{name:"Weekly Review",schedule:"0 17 * * 5",task:"Generate weekly task completion summary",enabled:!1,timezone:"local"}],c={id:e,version:t,type:a,metadata:r,requirements:s,content:o,skills:n,cronJobs:i};export{o as content,i as cronJobs,c as default,e as id,r as metadata,s as requirements,n as skills,a as type,t as version};
