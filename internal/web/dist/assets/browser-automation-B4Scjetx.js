const e="Browser Automation",n="Enable browser automation for web browsing, form filling, screenshots and page interaction",o={body:`## Browser Automation Capabilities

When enabled, the AI assistant can:
- Open web pages and read content
- Click buttons and fill forms
- Take page screenshots
- Execute JavaScript code (evaluateEnabled)
- Use Chrome DevTools Protocol (CDP) for advanced operations

## Configure in HermesDeckX

1. Go to Config Center → Browser
2. Turn on "Enable Browser"
3. Recommended: also enable "Page Evaluation" (evaluateEnabled) for full interaction capabilities

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| **enabled** | Enable browser | false |
| **evaluateEnabled** | Allow JS execution in pages | false |
| **headless** | Headless mode (no window) | true |
| **noSandbox** | Disable Chrome sandbox (needed in containers) | false |
| **executablePath** | Custom Chrome path | Auto-detect |

## Browser Profiles

You can create multiple browser profiles, each with independent CDP port and settings:

- Go to Config Center → Browser → Profiles
- Add a new profile with a specific cdpPort or cdpUrl
- Use case: one profile for automation, another for maintaining login state

## SSRF Security Policy

By default, browser access to internal network addresses is blocked (preventing SSRF attacks). If you need to access internal services:
- Add allowedHostnames in "SSRF Policy"
- **Not recommended** to enable allowPrivateNetwork unless you fully trust the AI's operations

## Configuration Field

Config path: \`browser.enabled\` and \`browser.evaluateEnabled\``},a={name:e,description:n,content:o};export{o as content,a as default,n as description,e as name};
