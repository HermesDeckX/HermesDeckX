const n="लागत अनुकूलन",t="AI उपयोग लागत को व्यापक रूप से कम करें — मॉडल चयन, संपीड़न, heartbeat और टूल रणनीति",e={body:`## लागत अनुकूलन चेकलिस्ट

### 1. सही मॉडल चुनें
- दैनिक: GPT-4o-mini / Claude Haiku / Gemini Flash
- जटिल कार्य: GPT-4o / Claude Sonnet
- सबसे महंगा मॉडल डिफ़ॉल्ट न रखें

### 2. संपीड़न सक्रिय करें
- Threshold 30000-50000
- memoryFlush सक्रिय करें

### 3. Heartbeat अनुकूलित करें
- सबसे सस्ता मॉडल heartbeat के लिए
- अंतराल बढ़ाएं (30-60 मिनट)
- सक्रिय समय कॉन्फ़िगर करें

### 4. सब-एजेंट रणनीति
- सब-एजेंट के लिए सस्ते मॉडल
- गहराई और संख्या सीमित करें

### 5. टूल नियंत्रण
- \`minimal\` या \`messaging\` प्रोफ़ाइल
- अनावश्यक टूल्स अक्षम करें

### 6. सत्र प्रबंधन
- दैनिक ऑटो-रीसेट
- नियमित \`/compact\`

## कॉन्फ़िगरेशन फ़ील्ड

पथ: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\`, \`tools.profile\``},a={name:n,description:t,content:e};export{e as content,a as default,t as description,n as name};
