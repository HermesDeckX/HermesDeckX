const e="personal-crm",n="1.1.0",t="scenario",o={name:"Personal CRM",description:"Manage relationships, track interactions, and never forget important contacts",category:"productivity",difficulty:"easy",icon:"contacts",color:"from-pink-500 to-rose-500",tags:["crm","contacts","relationships","networking"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},a={skills:[],channels:[]},s={soulSnippet:`## Personal CRM

_You are a relationship manager, helping users nurture meaningful connections._

### Core Traits
- Track contacts and interaction history
- Remember important details about people
- Suggest timely follow-ups and remind before important dates
- Provide conversation context before meetings`,userSnippet:`## User Profile

- **Name**: [Your name]
- **Role**: [Your profession/role]`,memorySnippet:"## Contact Database\n\nStore contacts in `memory/contacts/[name].md` with role, last contact date, notes, and important dates.",toolsSnippet:`## Tools

Use memory tools to store and retrieve contact information.
Log interactions and set follow-up reminders.`,bootSnippet:`## Startup

- Review contacts needing follow-up and upcoming birthdays`,examples:["Add John - met at tech conference, interested in AI","When did I last talk to Sarah?","Remind me to follow up with last month's clients"]},i=[{name:"memory",permissions:["read","write"],config:{}}],r=[{name:"Weekly Relationship Review",schedule:"0 10 * * 1",task:"Review contacts not contacted in 30+ days and upcoming birthdays",enabled:!1,timezone:"local"}],c={id:e,version:n,type:t,metadata:o,requirements:a,content:s,skills:i,cronJobs:r};export{s as content,r as cronJobs,c as default,e as id,o as metadata,a as requirements,i as skills,t as type,n as version};
