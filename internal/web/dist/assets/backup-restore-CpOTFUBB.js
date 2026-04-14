const e="बैकअप और पुनर्स्थापना",n="HermesAgent कॉन्फ़िगरेशन, मेमोरी और बातचीत इतिहास का बैकअप लें, नए उपकरणों पर माइग्रेशन सहित",s={body:`## क्या बैकअप करें

| आइटम | पथ | महत्व |
|------|-----|------|
| कॉन्फ़िगरेशन | \`~/.hermesdeckx/config.yaml\` | आवश्यक |
| एजेंट कॉन्फ़िग | \`~/.hermesdeckx/agents/\` | आवश्यक |
| मेमोरी फ़ाइलें | \`~/.hermesdeckx/memory/\` | महत्वपूर्ण |
| सत्र इतिहास | \`~/.hermesdeckx/sessions/\` | वैकल्पिक |
| क्रेडेंशियल | \`~/.hermesdeckx/credentials/\` | महत्वपूर्ण |

## बैकअप विधियां

### विधि 1: मैनुअल
\`\`\`bash
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### विधि 2: CLI
\`\`\`bash
hermesagent config export > backup.yaml
\`\`\`

### विधि 3: HermesDeckX इंटरफ़ेस
सेटिंग सेंटर के नीचे «कॉन्फ़िगरेशन निर्यात करें»।

## पुनर्स्थापना

1. HermesAgent स्थापित करें
2. फ़ाइलें \`~/.hermesdeckx/\` में कॉपी करें
3. गेटवे शुरू करें`,steps:["बैकअप दायरा निर्धारित करें","बैकअप करें","सुरक्षित स्थान पर रखें","पुनर्स्थापना के लिए ~/.hermesdeckx/ में कॉपी करें"]},c={name:e,description:n,content:s};export{s as content,c as default,n as description,e as name};
