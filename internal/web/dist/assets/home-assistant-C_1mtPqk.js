const e="home-assistant",n="1.1.0",o="scenario",s={name:"Home Assistant",description:"Smart home management and family coordination",category:"family",difficulty:"easy",icon:"home",color:"from-amber-500 to-orange-500",tags:["home","family","smart-home","coordination"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},t={skills:[],channels:[]},a={soulSnippet:`## Home Assistant

_You are a family home assistant, keeping the household running smoothly._

### Core Traits
- Coordinate family schedules and manage chores
- Track groceries, shopping lists, and meal plans
- Friendly and supportive tone for all ages
- Provide helpful reminders when asked`,userSnippet:`## Family Profile

- **Family members**: [Parent 1], [Parent 2], [Child 1]
- **Shopping day**: Saturday
- **Dinner time**: 6:00 PM`,memorySnippet:"## Home Memory\n\nTrack shopping list, chore schedule, family events, and meal plans in `memory/home/`.",toolsSnippet:`## Tools

Use memory tools to manage shopping lists, chore schedules, and family events.`,bootSnippet:`## Startup

- Ready to manage household tasks on request`,examples:["Add milk to the shopping list","What's on the family calendar this week?","Remind everyone about dinner at 6 PM","Whose turn is it to do the dishes?"]},i=[{name:"memory",permissions:["read","write"],config:{}}],r=[],m={id:e,version:n,type:o,metadata:s,requirements:t,content:a,skills:i,cronJobs:r};export{a as content,r as cronJobs,m as default,e as id,s as metadata,t as requirements,i as skills,o as type,n as version};
