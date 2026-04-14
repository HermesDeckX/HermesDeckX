const e="Message Status Reactions",s="Enable status emoji reactions so users can see AI processing stages in real-time",n={body:`## What are Status Reactions?

Status Reactions are emoji reactions that HermesAgent automatically adds to user messages during processing. Different emojis indicate different processing stages, letting users know what the AI is doing without waiting.

## Default Status Emojis

| Stage | Default Emoji | Meaning |
|-------|--------------|---------|
| thinking | 🤔 | AI is thinking |
| tool | 🔧 | AI is using a tool |
| coding | 💻 | AI is writing code |
| web | 🌐 | AI is searching the web |
| done | ✅ | Processing complete |
| error | ❌ | Processing error |
| stallSoft | ⏳ | Processing is slow |
| stallHard | ⚠️ | Processing is stuck |

## Configure in HermesDeckX

Go to Config Center → Messages → Find the "Status Reactions" area:

1. Turn on "Enable Status Reactions"
2. Customize emojis for each stage (optional)
3. Adjust timing parameters (optional)

## Timing Parameters

- **debounceMs** — Debounce delay to avoid frequent emoji switching (default 500ms)
- **stallSoftMs** — Time before showing "processing slow" emoji (default 30000ms = 30 seconds)
- **stallHardMs** — Time before showing "processing stuck" emoji (default 120000ms = 2 minutes)
- **doneHoldMs** — How long to keep the done emoji before removing (default 5000ms = 5 seconds)
- **errorHoldMs** — How long to keep the error emoji before removing

## Other Message Optimizations

- **ackReaction** — Acknowledgment emoji when message is received (e.g., 👀), letting users know it was received
- **removeAckAfterReply** — Auto-remove acknowledgment emoji after reply
- **suppressToolErrors** — Suppress detailed tool error messages (more user-friendly)

## Configuration Field

Config path: \`messages.statusReactions\``},o={name:e,description:s,content:n};export{n as content,o as default,s as description,e as name};
