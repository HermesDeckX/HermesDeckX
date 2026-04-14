const n="GitHub PR Hook मैपिंग",e="Webhook मैपिंग स्निपेट: GitHub Pull Request इवेंट को AI कोड रिव्यू निर्देशों में बदलें",t={snippet:`hooks:
  - name: github-pr-review
    description: "GitHub PR बनने पर स्वचालित कोड रिव्यू"
    mapping: |
      GitHub Pull Request इवेंट प्राप्त:

      **रिपॉजिटरी**: {{repository.full_name}}
      **शीर्षक**: {{pull_request.title}}
      **लेखक**: {{pull_request.user.login}}
      **विवरण**: {{pull_request.body}}

      कृपया इस PR की समीक्षा करें:
      1. कोड गुणवत्ता और सर्वोत्तम प्रथाएं जांचें
      2. संभावित बग और सुरक्षा समस्याएं खोजें
      3. सुधार सुझाव दें
      4. मित्रवत और रचनात्मक प्रतिक्रिया दें`},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
