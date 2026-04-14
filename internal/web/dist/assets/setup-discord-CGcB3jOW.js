const n="Discord बॉट सेटअप",e="Discord बॉट बनाएं और HermesAgent गेटवे से कनेक्ट करें",o={body:`## Discord बॉट बनाएं

### 1. Discord एप्लिकेशन बनाएं
1. discord.com/developers/applications पर जाएं
2. «New Application» क्लिक करें
3. «Bot» पेज → «Add Bot»

### 2. टोकन प्राप्त करें
1. «Reset Token» क्लिक करें
2. टोकन कॉपी करें
3. «Message Content Intent» सक्रिय करें (महत्वपूर्ण!)

### 3. बॉट को सर्वर पर आमंत्रित करें
1. «OAuth2 → URL Generator»
2. \`bot\` अनुमति चुनें
3. URL कॉपी करें और खोलें

### 4. HermesDeckX में कॉन्फ़िगर करें
1. «सेटिंग सेंटर → चैनल»
2. «चैनल जोड़ें» → Discord
3. टोकन पेस्ट करें
4. सेव करें`,steps:["Discord एप्लिकेशन बनाएं","बॉट बनाएं और टोकन कॉपी करें","Message Content Intent सक्रिय करें","आमंत्रण लिंक जनरेट करें","HermesDeckX में Discord चैनल जोड़ें","टोकन पेस्ट करें और सेव करें"]},s={name:n,description:e,content:o};export{o as content,s as default,e as description,n as name};
