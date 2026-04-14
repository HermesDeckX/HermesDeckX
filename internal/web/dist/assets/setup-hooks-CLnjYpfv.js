const e="Set Up Webhook Integration",t="Configure webhooks to receive external events (GitHub, email, custom services) for AI auto-response",n={body:`HermesAgent's webhook system receives HTTP requests from external services and converts events into AI conversations. Typical scenarios:
- GitHub push/PR event notifications to chat channels
- Auto-analyze and report incoming emails
- Monitoring alerts triggering AI analysis and suggestions

**Configuration Field Reference:**
- \`hooks.enabled\` — Whether to enable the webhook system
- \`hooks.path\` — Webhook receive path (default /hooks)
- \`hooks.token\` — Verification token to prevent unauthorized requests
- \`hooks.mappings[]\` — Routing rules to direct different webhooks to different agents/channels`,steps:[{title:"Enable Webhook System",description:'Go to Config Center → Hooks → Turn on "Enable Hooks". The system listens on /hooks path by default.'},{title:"Set Verification Token",description:"Set a security token in the Token field (recommend using a long random string). External services must include this token in the Header or URL parameter when sending requests."},{title:"Configure Route Mappings",description:`Click "Add Mapping" to create routing rules:
- match.path — Match path (e.g., /github)
- match.source — Match source identifier
- action — Select wake (wake heartbeat) or agent (trigger agent)
- messageTemplate — Message template, use {{body}} to reference request content
- channel/to — Specify delivery channel and contact`},{title:"Configure in External Service",description:"In GitHub/GitLab webhook settings, enter your gateway address + hooks path (e.g., https://your-gateway:18789/hooks/github), and fill the Token in the Secret field."},{title:"Test Webhook",description:`In GitHub's webhook settings, click "Recent Deliveries" → "Redeliver" to send a test request. Or use curl:
curl -X POST http://localhost:18789/hooks/test -H 'Authorization: Bearer YOUR_TOKEN' -d '{"message": "test"}'.`}]},o={name:e,description:t,content:n};export{n as content,o as default,t as description,e as name};
