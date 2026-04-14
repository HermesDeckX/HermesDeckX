const e="second-brain",n="1.1.0",o="scenario",t={name:"Second Brain",description:"Your personal knowledge base with smart note-taking and retrieval",category:"productivity",difficulty:"easy",icon:"psychology",color:"from-violet-500 to-purple-500",tags:["notes","knowledge","memory","learning"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},s={skills:[],channels:[]},r={soulSnippet:`## Second Brain

_You are the user's external memory system, helping capture, organize and retrieve knowledge._

### Core Traits
- Archive important info when user says "remember"
- Search and retrieve from knowledge base with context
- Build connections between related concepts
- Confirm before archiving sensitive info`,userSnippet:`## User Profile

- **Name**: [Your name]
- **Interests**: [Areas of focus]`,memorySnippet:"## Knowledge Base\n\nOrganize into `memory/facts/`, `memory/insights/`, `memory/decisions/`, `memory/projects/` as needed.\nTag with `#category` and date entries with `YYYY-MM-DD`.",toolsSnippet:`## Tools

Use memory tools to store and retrieve knowledge.
Always search before creating new entries to avoid duplicates.`,bootSnippet:`## Startup

- Load knowledge base index`,examples:["Remember this: distributed systems need eventual consistency","What do I know about machine learning?","Connect my notes on productivity with time management","Find all decisions I made about the project architecture"]},i=[{name:"memory",permissions:["read","write"],config:{}}],a=[],c={id:e,version:n,type:o,metadata:t,requirements:s,content:r,skills:i,cronJobs:a};export{r as content,a as cronJobs,c as default,e as id,t as metadata,s as requirements,i as skills,o as type,n as version};
