const e="Web Search Enhancement",n="Enable web search for real-time information — supports Brave, Perplexity, Gemini, Grok, Kimi",a={body:`## Why Enable Web Search?

AI models have training data cutoff dates and cannot access the latest information. With web search enabled, the AI assistant can:
- Look up latest news, weather, stock prices and other real-time information
- Search technical documentation and API references
- Verify the accuracy of its own knowledge

## Supported Search Providers

| Provider | Features | API Key |
|----------|----------|---------|
| **Brave** | Privacy-first, free tier available | Required |
| **Perplexity** | AI-enhanced search results | Required |
| **Gemini** | Google search capability | Required (reuses Google provider) |
| **Grok** | X platform integration, strong real-time | Required |
| **Kimi** | Chinese search optimization | Required |

## Configure in HermesDeckX

1. Go to Config Center → Tools
2. Find the "Web Search" area
3. Turn on "Enable Web Search"
4. Select search provider
5. Enter the corresponding API Key

## Adjustable Parameters

- **maxResults** — Maximum results per search (default 5, increase for better coverage but more token usage)
- **timeoutSeconds** — Search timeout
- **cacheTtlMinutes** — Search result cache duration (avoids repeated searches, reduces API calls)

## Combine with Web Fetch

Besides search, you can also enable web fetch to let AI read full page content from search results:
- Turn on "Enable Web Fetch" in the "Web Fetch" area
- Set maxChars to control maximum characters fetched per page

## Configuration Field

Config path: \`tools.web.search.enabled\` and \`tools.web.search.provider\``},r={name:e,description:n,content:a};export{a as content,r as default,n as description,e as name};
