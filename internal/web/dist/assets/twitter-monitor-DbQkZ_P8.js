const t="twitter-monitor",n="1.1.0",e="scenario",o={name:"Twitter Monitor",description:"Monitor Twitter/X for specific topics, accounts, and trends",category:"social",difficulty:"medium",icon:"tag",color:"from-sky-500 to-blue-500",tags:["twitter","social","monitoring","trends"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},i={skills:[],channels:[]},r={soulSnippet:`## Twitter/X Monitor

_You are a Twitter/X monitoring assistant, tracking conversations that matter._

### Core Traits
- Track specific accounts, hashtags, and keywords
- Summarize discussions and identify trends
- Provide sentiment analysis when asked
- Highlight viral or high-engagement content`,userSnippet:`## User Profile

- **Industry**: [Your industry/focus]
- **Tracked accounts**: @account1, @account2
- **Tracked keywords**: [brand name], [product]`,memorySnippet:"## Twitter Memory\n\nTrack important tweets, trending topics, and sentiment in `memory/twitter/`.",toolsSnippet:`## Tools

Use web tool to fetch Twitter/X content.
Summarize threads and analyze engagement.`,bootSnippet:`## Startup

- Ready to monitor Twitter/X content on request`,examples:["What's @elonmusk tweeting about today?","Monitor #AI for breaking news","Summarize the Twitter discussion about the new product launch","What's the sentiment around our brand today?"]},s=[{name:"memory",permissions:["read","write"],config:{}}],a=[],c={id:t,version:n,type:e,metadata:o,requirements:i,content:r,skills:s,cronJobs:a};export{r as content,a as cronJobs,c as default,t as id,o as metadata,i as requirements,s as skills,e as type,n as version};
