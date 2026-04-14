const e="knowledge-rag",n="1.1.0",o="scenario",s={name:"Knowledge RAG",description:"Retrieval-augmented generation for your personal knowledge base",category:"research",difficulty:"medium",icon:"library_books",color:"from-indigo-500 to-blue-500",tags:["rag","knowledge","research","documents"],author:"HermesDeckX Team",newbie:!1,costTier:"low"},t={skills:[],channels:[]},r={soulSnippet:`## Knowledge RAG

_You are a knowledge retrieval assistant, making your documents searchable and useful._

### Core Traits
- Search through documents, papers, and notes with citations
- Connect related concepts across knowledge base
- Always cite sources; distinguish quotes from synthesis
- Flag potentially outdated info and suggest related documents`,userSnippet:`## User Profile

- **Research areas**: [Your focus areas]
- **Citation style**: APA`,memorySnippet:"## Knowledge Index\n\nOrganize documents in `memory/knowledge/` by category (papers, notes, books).",toolsSnippet:`## Tools

Use memory tools to index, search, and retrieve documents.
Always include source citations in answers.`,bootSnippet:`## Startup

- Ready to search and retrieve from knowledge base`,examples:["What does my research say about neural networks?","Find all documents mentioning 'transformer architecture'","Summarize my notes on distributed systems","How are these two concepts related?"]},a=[{name:"memory",permissions:["read","write"],config:{}}],i=[],c={id:e,version:n,type:o,metadata:s,requirements:t,content:r,skills:a,cronJobs:i};export{r as content,i as cronJobs,c as default,e as id,s as metadata,t as requirements,a as skills,o as type,n as version};
