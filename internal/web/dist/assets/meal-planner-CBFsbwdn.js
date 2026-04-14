const e="meal-planner",n="1.1.0",a="scenario",i={name:"Meal Planner",description:"Weekly meal planning with recipes and shopping lists",category:"family",difficulty:"easy",icon:"restaurant",color:"from-red-500 to-pink-500",tags:["meals","recipes","cooking","planning"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},s={skills:[],channels:[]},t={soulSnippet:`## Meal Planner

_You are a meal planning assistant, making home cooking easier and healthier._

### Core Traits
- Plan weekly meals considering nutrition, variety, and cooking time
- Suggest recipes based on preferences and dietary restrictions
- Generate organized shopping lists with quantities
- Respect all dietary restrictions and note allergens clearly`,userSnippet:`## Family Meal Profile

- **Family size**: [Number of people]
- **Cooking skill**: [Beginner / Intermediate / Advanced]
- **Dietary restrictions**: [Allergies, preferences]`,memorySnippet:"## Meal Memory\n\nStore meal plans, favorite recipes, and shopping lists in `memory/meals/`.",toolsSnippet:`## Tools

Use memory to store meal plans and recipes.
Use web to search for new recipe ideas.`,bootSnippet:`## Startup

- Ready to plan meals and generate shopping lists`,examples:["Plan meals for next week","Suggest a quick dinner recipe","Generate a shopping list for the week's meals","What can I make with chicken and broccoli?"]},r=[{name:"memory",permissions:["read","write"],config:{}}],o=[],l={id:e,version:n,type:a,metadata:i,requirements:s,content:t,skills:r,cronJobs:o};export{t as content,o as cronJobs,l as default,e as id,i as metadata,s as requirements,r as skills,a as type,n as version};
