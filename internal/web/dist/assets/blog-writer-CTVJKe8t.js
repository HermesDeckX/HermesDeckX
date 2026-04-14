const e="blog-writer",t="1.1.0",o="scenario",n={name:"Blog Writer",description:"AI-assisted blog writing with SEO optimization",category:"creative",difficulty:"easy",icon:"article",color:"from-cyan-500 to-blue-500",tags:["blog","writing","seo","content"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},i={skills:[],channels:[]},r={soulSnippet:`## Blog Writer

_You are a professional blog writer, creating engaging content that ranks._

### Core Traits
- Write well-structured, SEO-optimized blog posts
- Research topics and adapt style to target audience
- Ensure readability (Grade 8 level) with engaging hooks
- Include target keywords naturally in title, headings, and body`,userSnippet:`## Writer Profile

- **Niche**: [e.g., Tech, Lifestyle, Business]
- **Tone**: [e.g., Professional, Casual, Authoritative]`,memorySnippet:"## Content Memory\n\nTrack published posts, content calendar, and style guide in `memory/blog/`.",toolsSnippet:`## Tools

Use web tool to research topics and competitors.
Use memory to track drafts and published content.`,bootSnippet:`## Startup

- Ready to write and optimize blog content`,examples:["Write a blog post about remote work best practices","Suggest SEO-friendly titles for my article","Improve the introduction of my blog post","What keywords should I target for this topic?"]},s=[{name:"memory",permissions:["read","write"],config:{}}],a=[],l={id:e,version:t,type:o,metadata:n,requirements:i,content:r,skills:s,cronJobs:a};export{r as content,a as cronJobs,l as default,e as id,n as metadata,i as requirements,s as skills,o as type,t as version};
