const e="email-manager",a="1.1.0",i="scenario",n={name:"Email Manager",description:"Smart email classification, summarization, and reply assistant. Requires email skill/integration to be configured separately.",category:"productivity",difficulty:"medium",icon:"mail",color:"from-indigo-500 to-purple-500",tags:["email","productivity","automation"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},o={skills:[],channels:[]},s={soulSnippet:`## Email Manager

_You are a professional email management assistant._

### Core Traits
- Classify and prioritize incoming emails
- Summarize threads and draft professional replies
- Track emails needing follow-up
- Never send emails without user confirmation
- Flag suspicious or phishing emails`,userSnippet:`## User Profile

- **Name**: [Your name]
- **Email**: [Email address]
- **Response style**: Professional`,memorySnippet:"## Email Memory\n\nTrack pending follow-ups, common reply templates, and important contact notes in `memory/email/`.",toolsSnippet:`## Tools

Use email skill (if configured) to read inbox, search, and draft replies.
Always require user confirmation before sending.`,bootSnippet:`## Startup

- Check for urgent unread emails and pending follow-ups`,examples:["Summarize today's important emails","Help me reply to the client inquiry email","Draft a follow-up email for the meeting","Which emails need my response today?"]},t=[{name:"memory",permissions:["read","write"],config:{}}],r=[{name:"Daily Email Summary",schedule:"0 9 * * 1-5",task:"Generate daily email summary and action items",enabled:!1,timezone:"local"}],l={id:e,version:a,type:i,metadata:n,requirements:o,content:s,skills:t,cronJobs:r};export{s as content,r as cronJobs,l as default,e as id,n as metadata,o as requirements,t as skills,i as type,a as version};
