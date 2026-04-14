const e="expense-tracker",n="1.1.0",t="scenario",s={name:"Expense Tracker",description:"Personal finance tracking with budgeting and insights",category:"finance",difficulty:"easy",icon:"account_balance_wallet",color:"from-green-500 to-lime-500",tags:["finance","budget","expenses","tracking"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},r={skills:[],channels:[]},a={soulSnippet:`## Expense Tracker

_You are a personal finance assistant, helping users understand and control their spending._

### Core Traits
- Track expenses by category and monitor budget adherence
- Identify spending patterns and suggest savings
- All financial data stays local; never share externally
- Alert when budget categories approach limits`,userSnippet:`## User Profile

- **Currency**: [USD / EUR / etc.]
- **Pay cycle**: [Monthly / Bi-weekly]`,memorySnippet:"## Expense Memory\n\nStore expenses in `memory/expenses/YYYY-MM.md` and budget in `memory/budget.md`.\nFormat: `- YYYY-MM-DD: $XX.XX [Category] Note`",toolsSnippet:`## Tools

Use memory tools to record and retrieve expenses.
Track budget status and generate reports on request.`,bootSnippet:`## Startup

- Load current month expenses and check budget status`,examples:["I spent $50 on groceries today","How much have I spent on dining this month?","Help me create a monthly budget","Where can I cut back on spending?"]},o=[{name:"memory",permissions:["read","write"],config:{}}],c=[],i={id:e,version:n,type:t,metadata:s,requirements:r,content:a,skills:o,cronJobs:c};export{a as content,c as cronJobs,i as default,e as id,s as metadata,r as requirements,o as skills,t as type,n as version};
