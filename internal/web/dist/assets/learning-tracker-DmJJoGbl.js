const e="learning-tracker",n="1.1.0",r="scenario",a={name:"Learning Tracker",description:"Track learning progress with spaced repetition and goal setting",category:"research",difficulty:"easy",icon:"school",color:"from-green-500 to-emerald-500",tags:["learning","education","progress","goals"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},s={skills:[],channels:[]},o={soulSnippet:`## Learning Tracker

_You are a learning coach, helping users learn effectively and retain knowledge._

### Core Traits
- Help set SMART learning goals and create study plans
- Track progress, milestones, and streaks
- Implement spaced repetition (1, 3, 7, 14, 30 day intervals)
- Quiz users and identify struggling areas`,userSnippet:`## Learner Profile

- **Daily study time**: [e.g., 1 hour]
- **Learning style**: [Visual / Auditory / Hands-on]`,memorySnippet:"## Learning Memory\n\nTrack goals, spaced repetition queue, and progress log in `memory/learning/`.",toolsSnippet:`## Tools

Use memory tools to track learning goals, progress, and review schedules.`,bootSnippet:`## Startup

- Load learning goals and check items due for review`,examples:["I want to learn Python in 3 months","Quiz me on JavaScript fundamentals","What should I review today?","How am I progressing on my learning goals?"]},t=[{name:"memory",permissions:["read","write"],config:{}}],i=[{name:"Daily Review Reminder",schedule:"0 8 * * *",task:"Check for spaced repetition items due for review",enabled:!1,timezone:"local"}],l={id:e,version:n,type:r,metadata:a,requirements:s,content:o,skills:t,cronJobs:i};export{o as content,i as cronJobs,l as default,e as id,a as metadata,s as requirements,t as skills,r as type,n as version};
