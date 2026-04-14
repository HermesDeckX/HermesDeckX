const e="Memory Search Not Working",n="Troubleshoot when memory search returns no results or inaccurate matches",t={question:"What should I do when memory search returns no results or inaccurate results?",answer:`## Troubleshooting Steps

### 1. Confirm Memory Search is Enabled
Go to Config Center → Memory → Check if "Enable Memory Search" is turned on.

### 2. Check Embedding Provider
Memory search requires an embedding provider to generate vectors:
- Confirm an embedding provider is selected (openai / gemini / local / ollama)
- If using openai, confirm the OpenAI API Key is valid and has balance
- If using local, first startup needs to download the model, may take a few minutes

### 3. Wait for Index Building
After first enabling or adding new content, the system needs time to build the vector index:
- Small data (<100 items): seconds to 1 minute
- Medium data (100-1000 items): 1-5 minutes
- Large data (>1000 items): 5-30 minutes
- Check logs to confirm indexing is complete

### 4. Check Search Scope
Confirm sources configuration is correct:
- **memory** — Search MEMORY.md file
- **sessions** — Search historical sessions
- If neither is checked, search won't return results

### 5. Check MEMORY.md Content
Go to Config Center → Agents → View the MEMORY.md file:
- Confirm the file is not empty
- Content format should be clear (headings + bullet points work best)
- Avoid large blocks of unstructured text

### 6. Adjust Search Parameters
If results exist but are inaccurate:
- Lower \`minScore\` threshold (e.g., from 0.5 to 0.3) to increase recall
- Increase \`maxResults\` to return more candidates
- Enable \`hybrid\` search (combining vector + keyword) for better results

### 7. Manually Trigger Sync
If you recently modified MEMORY.md but search hasn't updated:
- Restart the gateway to trigger a full sync
- Or wait for the auto-sync cycle (default: checks every 5 minutes)

## Quick Fix

Run Health Center diagnostics → Check memory-related items.`},r={name:e,description:n,content:t};export{t as content,r as default,n as description,e as name};
