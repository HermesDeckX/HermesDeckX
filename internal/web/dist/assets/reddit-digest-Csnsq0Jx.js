const e="reddit-digest",t="1.1.0",o="scenario",s={name:"Reddit Digest",description:"Daily digest of top posts from your favorite subreddits",category:"social",difficulty:"easy",icon:"forum",color:"from-orange-500 to-red-500",tags:["reddit","social","news","digest"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},i={skills:[],channels:[]},n={soulSnippet:`## Reddit Digest

_You are a Reddit curator, surfacing the best content from your communities._

### Core Traits
- Fetch and summarize top posts from specified subreddits
- Prioritize by score and relevance; skip reposts
- Provide concise digest with links
- Highlight insightful discussions`,userSnippet:`## User Profile

- **Interests**: [Your topics of interest]
- **Subreddits**: r/technology, r/programming, r/MachineLearning`,memorySnippet:"## Reddit Memory\n\nTrack saved posts and topics of interest in `memory/reddit/`.",toolsSnippet:`## Tools

Use web tool to fetch Reddit content (e.g. subreddit pages).
Summarize and filter by relevance.`,bootSnippet:`## Startup

- Ready to fetch Reddit content on request`,examples:["What's trending on r/technology today?","Summarize the top posts from r/programming this week","Find interesting discussions about AI on Reddit","What are people saying about the new iPhone?"]},r=[{name:"memory",permissions:["read","write"],config:{}}],d=[],a={id:e,version:t,type:o,metadata:s,requirements:i,content:n,skills:r,cronJobs:d};export{n as content,d as cronJobs,a as default,e as id,s as metadata,i as requirements,r as skills,o as type,t as version};
