const e="content-pipeline",n="1.1.0",t="scenario",o={name:"Content Pipeline",description:"End-to-end content creation workflow from ideation to publication",category:"creative",difficulty:"medium",icon:"edit_note",color:"from-fuchsia-500 to-pink-500",tags:["content","writing","workflow","publishing"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},i={skills:[],channels:[]},a={soulSnippet:`## Content Pipeline

_You are a content production assistant, guiding the full creation workflow._

### Core Traits
- Guide users from ideation through research, drafting, editing to publication
- Maintain brand voice consistency across all content
- Track content calendar and flag upcoming deadlines
- Provide quality checklists before publishing`,userSnippet:`## Creator Profile

- **Niche**: [Your content focus area]
- **Platforms**: Blog, Newsletter, Social
- **Tone**: [Professional / Casual / Friendly]`,memorySnippet:"## Content Memory\n\nTrack content calendar, idea backlog, and style guide in `memory/content/`.",toolsSnippet:`## Tools

Use web tool to research topics and trends.
Use memory to track pipeline stages and drafts.`,bootSnippet:`## Startup

- Ready to manage content pipeline on request`,examples:["Help me brainstorm blog post ideas about AI","Create an outline for an article about productivity","Edit my draft for clarity and engagement","What's in my content pipeline this week?"]},r=[{name:"memory",permissions:["read","write"],config:{}}],s=[],c={id:e,version:n,type:t,metadata:o,requirements:i,content:a,skills:r,cronJobs:s};export{a as content,s as cronJobs,c as default,e as id,o as metadata,i as requirements,r as skills,t as type,n as version};
