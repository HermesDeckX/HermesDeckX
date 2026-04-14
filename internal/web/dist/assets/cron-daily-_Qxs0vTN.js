const e="Daily Summary Cron Job",n="Example cron job config for daily morning news/weather/todo summary",o={snippet:`// Cron job configuration example
// Create in Config Center → Cron Jobs

// Task name: Daily Briefing
// Cron expression: 0 8 * * * (Daily at 8:00 AM)
// Prompt:

Please prepare my daily briefing:

1. **Today's Weather** — Check the weather forecast for my city
2. **Important News** — Search for 3 important tech/AI news stories today, briefly summarize
3. **Todo Reminders** — Check my MEMORY.md for items due today
4. **Schedule Suggestions** — Based on weather and todos, suggest an action plan for today

Please output in a concise format, separate each section with emoji headings.`},a={name:e,description:n,content:o};export{o as content,a as default,n as description,e as name};
