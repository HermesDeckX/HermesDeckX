const n="गेटवे नहीं चल रहा",e="HermesAgent गेटवे के शुरू न होने या असामान्य रूप से काम करने की समस्या का समाधान",s={question:"अगर गेटवे शुरू न हो या असामान्य रूप से काम करे तो क्या करें?",answer:`## समाधान के चरण

### 1. गेटवे स्थिति जांचें
HermesDeckX डैशबोर्ड के शीर्ष पर संकेतक:
- 🟢 चल रहा है — सामान्य
- 🔴 रुका हुआ — शुरू करना आवश्यक
- 🟡 शुरू हो रहा है — प्रतीक्षा

### 2. पोर्ट उपयोग जांचें
गेटवे डिफ़ॉल्ट रूप से पोर्ट 18789 उपयोग करता है।
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`

### 3. कॉन्फ़िगरेशन फ़ाइल जांचें
- \`~/.hermesdeckx/config.yaml\` मौजूद और सही फॉर्मेट में होनी चाहिए

### 4. Node.js संस्करण जांचें
- HermesAgent को Node.js 18+ चाहिए
- \`node --version\` से जांचें
- Node.js 22 LTS अनुशंसित

### 5. लॉग जांचें
- स्थान: \`~/.hermesdeckx/logs/\`

### 6. पुनः स्थापित करें
- \`npm install -g hermesagent@latest\`

## त्वरित समाधान

HermesDeckX में «गेटवे शुरू करें» क्लिक करें या \`hermesagent gateway run\` चलाएं।`},t={name:n,description:e,content:s};export{s as content,t as default,e as description,n as name};
