const n="إضافة مزود AI",e="إعداد مفاتيح API وخيارات مزودي نماذج الذكاء الاصطناعي مثل OpenAI وAnthropic وGoogle",o={body:`## المزودون المدعومون

| المزود | أمثلة النماذج | المميزات |
|--------|-------------|----------|
| **OpenAI** | GPT-4o، GPT-4o-mini | النظام البيئي الأكثر نضجاً |
| **Anthropic** | Claude Sonnet، Haiku | أمان عالٍ، سياق طويل |
| **Google** | Gemini Pro، Flash | متعدد الوسائط، منخفض التكلفة |
| **DeepSeek** | DeepSeek Chat، Coder | قيمة ممتازة مقابل السعر |
| **Ollama** | Llama، Mistral | نشر محلي، مجاني |

## الإعداد في HermesDeckX

1. «مركز الإعدادات → مزودو النماذج»
2. «إضافة مزود»
3. اختيار النوع وإدخال مفتاح API
4. تحديد النماذج
5. حفظ

## حقول الإعدادات

المسار: \`providers\``,steps:["مركز الإعدادات → المزودون","إضافة مزود","النوع ومفتاح API","تحديد النماذج","حفظ"]},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
