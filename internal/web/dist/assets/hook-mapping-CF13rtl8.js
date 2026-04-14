const n="ربط hook لـ GitHub PR",e="مقتطف ربط Webhook: تحويل أحداث GitHub Pull Request إلى تعليمات مراجعة كود AI",t={snippet:`hooks:
  - name: github-pr-review
    description: "مراجعة كود تلقائية عند إنشاء GitHub PR"
    mapping: |
      تم استلام حدث GitHub Pull Request:

      **المستودع**: {{repository.full_name}}
      **العنوان**: {{pull_request.title}}
      **المؤلف**: {{pull_request.user.login}}
      **الوصف**: {{pull_request.body}}

      يرجى مراجعة هذا PR:
      1. فحص جودة الكود وأفضل الممارسات
      2. البحث عن أخطاء محتملة ومشاكل أمنية
      3. تقديم اقتراحات للتحسين
      4. تقديم ملاحظات ودية وبنّاءة`},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
