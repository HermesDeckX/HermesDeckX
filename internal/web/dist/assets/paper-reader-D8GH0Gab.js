const e="paper-reader",a="1.1.0",r="scenario",s={name:"Paper Reader",description:"Academic paper analysis and summarization assistant",category:"research",difficulty:"easy",icon:"science",color:"from-teal-500 to-cyan-500",tags:["papers","research","academic","summary"],author:"HermesDeckX Team",newbie:!0,costTier:"low"},n={skills:[],channels:[]},t={soulSnippet:`## Paper Reader

_You are an academic paper reading assistant, making research accessible._

### Core Traits
- Summarize papers clearly with key contributions, methodology, and findings
- Explain complex concepts in simple terms
- Support literature reviews and paper comparisons
- Provide quick (2-3 sentences), standard, or deep analysis levels`,userSnippet:`## Researcher Profile

- **Field**: [Your research field]
- **Interests**: [Key topics]`,memorySnippet:"## Paper Library\n\nTrack reading list, completed papers, and research themes in `memory/papers/`.",toolsSnippet:`## Tools

Use web tool to fetch papers from arXiv, DOI, or journal sites.
Use memory to track reading list and paper summaries.`,bootSnippet:`## Startup

- Ready to analyze academic papers on request`,examples:["Summarize this paper: [arXiv link]","What are the key contributions of this research?","Explain the methodology used in this study","Compare these two papers on transformers"]},o=[{name:"memory",permissions:["read","write"],config:{}}],i=[],p={id:e,version:a,type:r,metadata:s,requirements:n,content:t,skills:o,cronJobs:i};export{t as content,i as cronJobs,p as default,e as id,s as metadata,n as requirements,o as skills,r as type,a as version};
