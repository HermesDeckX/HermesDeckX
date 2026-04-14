const n="त्वरित शुरुआत",e="HermesAgent गेटवे स्थापित करें, कॉन्फ़िगर करें और 5 मिनट में पहली बातचीत शुरू करें",t={body:`## पूर्वापेक्षाएं

- Node.js 22+ (LTS अनुशंसित)
- AI प्रदाता का API कुंजी (OpenAI / Anthropic / Google आदि)

## चरण

### 1. HermesAgent स्थापित करें

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. कॉन्फ़िगरेशन आरंभ करें

\`\`\`bash
hermesagent init
\`\`\`

### 3. गेटवे शुरू करें

\`\`\`bash
hermesagent gateway run
\`\`\`

### 4. HermesDeckX कनेक्ट करें

HermesDeckX खोलें और गेटवे पता दर्ज करें।

### 5. चैट चैनल कनेक्ट करें (वैकल्पिक)

1. «सेटिंग सेंटर → चैनल»
2. चैनल प्रकार चुनें
3. बॉट टोकन दर्ज करें
4. सेव करें`,steps:["Node.js 22+ स्थापित करें","npm install -g hermesagent@latest","hermesagent init चलाएं","API कुंजी दर्ज करें","hermesagent gateway run","HermesDeckX कनेक्ट करें"]},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
