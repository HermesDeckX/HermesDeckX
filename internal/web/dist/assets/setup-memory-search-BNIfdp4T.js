const e="Enable Memory Search",n="Configure vector search so your AI can retrieve past conversations and knowledge files for long-term memory",o={body:`Memory Search lets your AI assistant semantically retrieve relevant content from past conversations and knowledge files. This is the key feature for making your AI "never forget".

**How It Works:**
1. HermesAgent converts MEMORY.md, past sessions and other content into vector embeddings
2. When users ask questions, the system automatically searches for the most semantically relevant memory fragments
3. Found content is injected into the AI's context, helping it give more accurate answers

**Supported Embedding Providers:** OpenAI, Google Gemini, Voyage, Mistral, Ollama (local)`,steps:[{title:"Enable Memory Search",description:'Go to Config Center → Memory → Turn on "Enable Memory Search".'},{title:"Select Embedding Provider",description:`In the "Embedding Provider" dropdown, select:
- **openai** — Uses OpenAI's text-embedding models (requires API Key)
- **gemini** — Uses Google's embedding models
- **local** — Uses local models (no API Key needed, slightly lower quality)
- **ollama** — Uses local Ollama inference
Recommended for new users: openai for best results.`},{title:"Configure Search Scope",description:`In sources, select content sources to search:
- **memory** — Search MEMORY.md file content
- **sessions** — Search historical session records
Recommended: check both for best memory performance.`},{title:"Adjust Query Parameters (Optional)",description:`Advanced users can adjust:
- maxResults — Maximum results per search (default 5)
- minScore — Minimum relevance threshold (0-1, default 0.3)
- hybrid.enabled — Enable hybrid search (vector + keyword) for better recall`},{title:"Save and Verify",description:"After saving, mention something from a previous conversation in chat and observe if the AI can recall it. First-time enabling may require waiting for index building to complete."}]},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
