const n="अनुसूचित कार्य सेटअप",e="Heartbeat कार्यों का उपयोग करें ताकि AI स्वचालित रूप से जांच, सारांश भेजे और रखरखाव करे",t={body:`## Heartbeat क्या है?

Heartbeat HermesAgent का अनुसूचित कार्य प्रणाली है:
- प्रतिदिन समाचार सारांश भेजना
- हर घंटे ईमेल जांचना
- साप्ताहिक रिपोर्ट बनाना

## HermesDeckX में कॉन्फ़िगर करें

«सेटिंग सेंटर → शेड्यूलिंग»:

- **enabled** — Heartbeat सक्रिय करें
- **intervalMinutes** — निष्पादन अंतराल
- **model** — किफ़ायती मॉडल अनुशंसित

### सक्रिय समय
- **activeHoursStart/End** — जैसे 8:00-22:00
- **timezone** — समय क्षेत्र`,steps:["सेटिंग सेंटर → शेड्यूलिंग","Heartbeat सक्रिय करें","अंतराल और समय सेट करें","मॉडल चुनें","निर्देश लिखें","सेव करें"]},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
