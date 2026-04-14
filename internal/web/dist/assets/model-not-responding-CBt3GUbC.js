const e="Model Not Responding",n="Troubleshoot when the AI model doesn't reply, times out or returns errors",o={question:"What should I do when the AI model doesn't reply or returns errors?",answer:`## Troubleshooting Steps

### 1. Check Provider Connection
Go to Config Center → Models, find your provider, and click "Test Connection":
- ✅ Connection successful → Provider is fine, issue is elsewhere
- ❌ Connection failed → Check if API Key is correct or expired

### 2. Check API Key
- Confirm the API Key hasn't expired or been revoked
- Confirm the account has sufficient balance (many providers reject requests at 0 balance)
- Try testing the same key in the provider's official Playground

### 3. Check Network Connection
- Confirm your network can access the provider's API address
- If in mainland China, some providers (OpenAI, Anthropic) require a proxy
- Check if the correct Base URL is set (custom proxy address)

### 4. Check Model Name
- Confirm the primary model name is spelled correctly (case-sensitive)
- Some provider model names may have been updated (e.g., gpt-4-turbo → gpt-4o)
- Click "Discover Models" in Config Center → Models to get the latest model list

### 5. Check Rate Limiting
- If the error contains 429 or rate_limit, request frequency is too high
- Solution: Configure fallback models so HermesAgent auto-switches
- Or reduce heartbeat frequency in Config Center → Agents → Heartbeat

### 6. Check Timeout
- If the model responds slowly, it may be under heavy load
- Go to Config Center → Agents → Increase timeoutSeconds (default 120 seconds)

## Quick Fix

1. Run Health Center diagnostics and check model-related items
2. Ensure at least one fallback model is configured
3. If the issue persists, switch to a different provider's model`},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
