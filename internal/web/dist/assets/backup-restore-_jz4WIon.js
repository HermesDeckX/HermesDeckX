const e="Backup & Restore Config",n="Export full configuration via HermesDeckX for cross-device migration or disaster recovery",t={body:`Regularly backing up your HermesAgent configuration prevents accidental loss and makes it easy to migrate between devices. HermesDeckX provides visual export/import functionality.

**Backup Includes:**
- Complete hermesagent.json configuration file (providers, models, channels, sessions and all settings)
- Agent files (IDENTITY.md, SOUL.md, USER.md, MEMORY.md)
- Cron jobs and webhook configuration

**Not Included:**
- API Keys (for security, must be re-entered on new devices)
- Historical session data (stored in local database)
- Installed skills and plugins (need reinstallation)`,steps:[{title:"Export Configuration",description:'Go to Config Center → JSON Editor → Click the "Export" button in the toolbar. The system will download the complete current configuration as a JSON file. You can also directly copy all content from the JSON Editor.'},{title:"Backup Agent Files",description:"Go to Config Center → Agents → Click each agent's file list and copy the content of IDENTITY.md, SOUL.md, etc. one by one. Or directly backup all files in the ~/.hermesagent/agents/ directory."},{title:"Restore on New Device",description:"Install HermesAgent and HermesDeckX on the new device → Go to Config Center → JSON Editor → Paste the backed-up JSON configuration → Save."},{title:"Fill in Sensitive Information",description:"After restoring, re-enter all API Keys: Go to Config Center → Models and re-enter API Keys for each provider. Also check if channel tokens need updating."},{title:"Verify Restoration",description:"Run Health Center diagnostics to confirm all configuration items are normal. Red errors usually mean API Keys or tokens haven't been re-entered."}]},o={name:e,description:n,content:t};export{t as content,o as default,n as description,e as name};
