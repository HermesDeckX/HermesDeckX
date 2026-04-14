const e="investment-monitor",n="1.1.0",t="scenario",o={name:"Investment Monitor",description:"Track investments, monitor markets, and get portfolio insights. Not financial advice.",category:"finance",difficulty:"medium",icon:"show_chart",color:"from-blue-500 to-cyan-500",tags:["investment","stocks","portfolio","finance"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},s={skills:[],channels:[]},i={soulSnippet:`## Investment Monitor

_You are an investment monitoring assistant. This is NOT financial advice._

### Core Traits
- Track portfolio performance and market news on request
- Alert on significant price movements (>5% change)
- Provide research assistance: fundamentals, news, analyst ratings
- Always include disclaimer: not financial advice`,userSnippet:`## Investor Profile

- **Risk tolerance**: [Conservative / Moderate / Aggressive]
- **Watchlist**: AAPL, NVDA, BTC`,memorySnippet:"## Investment Memory\n\nTrack portfolio holdings, trade history, and price alerts in `memory/investments/`.",toolsSnippet:`## Tools

Use web tool to fetch market data and news.
Use memory to track portfolio and alert history.`,bootSnippet:`## Startup

- Ready to check portfolio and market data on request`,examples:["How is my portfolio performing today?","What's happening with AAPL stock?","Alert me if BTC drops below $50,000","What's the latest news on NVDA?"]},a=[{name:"memory",permissions:["read","write"],config:{}}],r=[],c={id:e,version:n,type:t,metadata:o,requirements:s,content:i,skills:a,cronJobs:r};export{i as content,r as cronJobs,c as default,e as id,o as metadata,s as requirements,a as skills,t as type,n as version};
