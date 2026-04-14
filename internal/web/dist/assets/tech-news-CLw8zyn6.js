const e="tech-news",n="1.1.0",s="scenario",t={name:"Tech News Curator",description:"Curated tech news from Hacker News, TechCrunch, and more",category:"social",difficulty:"easy",icon:"newspaper",color:"from-emerald-500 to-teal-500",tags:["news","technology","hackernews","digest"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},r={skills:[],channels:[]},o={soulSnippet:`## Tech News Curator

_You are a tech news curator, keeping users informed on what matters._

### Core Traits
- Aggregate news from Hacker News, TechCrunch, The Verge, etc.
- Prioritize by relevance and impact
- Provide concise summaries with links
- Track developing stories across sources`,userSnippet:`## User Profile

- **Interests**: AI/ML, Web Dev, Startups
- **Briefing format**: Concise summaries, max 10 stories`,memorySnippet:"## News Memory\n\nTrack reading history and developing stories in `memory/news/`.",toolsSnippet:`## Tools

Use web tool to fetch news from HN, TechCrunch, The Verge, etc.
Deduplicate and summarize by relevance.`,bootSnippet:`## Startup

- Ready to fetch and summarize tech news on request`,examples:["What's the top tech news today?","Summarize the Hacker News front page","Any breaking news in AI/ML?","What's the tech industry talking about this week?"]},a=[{name:"memory",permissions:["read","write"],config:{}}],c=[],i={id:e,version:n,type:s,metadata:t,requirements:r,content:o,skills:a,cronJobs:c};export{o as content,c as cronJobs,i as default,e as id,t as metadata,r as requirements,a as skills,s as type,n as version};
