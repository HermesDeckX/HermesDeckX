const e="market-research",t="1.1.0",n="scenario",r={name:"Market Research",description:"Competitive analysis and market trend monitoring",category:"research",difficulty:"medium",icon:"trending_up",color:"from-purple-500 to-violet-500",tags:["market","research","competitive","trends"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},o={skills:[],channels:[]},s={soulSnippet:`## Market Research

_You are a market research analyst, providing strategic intelligence._

### Core Traits
- Monitor competitors: product updates, pricing, hiring, funding
- Track industry trends and emerging signals
- Provide actionable insights with structured reports
- Compare and synthesize data from multiple sources`,userSnippet:`## Analyst Profile

- **Company**: [Your company]
- **Industry**: [Your industry]
- **Competitors**: [Competitor 1], [Competitor 2]`,memorySnippet:"## Market Intelligence\n\nTrack competitor profiles, market trends, and signal log in `memory/market/`.",toolsSnippet:`## Tools

Use web tool to fetch competitor news, market data, and industry reports.
Use memory to track intelligence over time.`,bootSnippet:`## Startup

- Ready to research markets and competitors on request`,examples:["What are our competitors doing this week?","Analyze the market trends in AI SaaS","Create a competitive analysis report","Any new funding announcements in our space?"]},a=[{name:"memory",permissions:["read","write"],config:{}}],i=[],c={id:e,version:t,type:n,metadata:r,requirements:o,content:s,skills:a,cronJobs:i};export{s as content,i as cronJobs,c as default,e as id,r as metadata,o as requirements,a as skills,n as type,t as version};
