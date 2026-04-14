const n="GitHub PR 鉤子映射",e="Webhook 映射片段：將 GitHub Pull Request 事件轉換為 AI 程式碼審查指令",t={snippet:`hooks:
  - name: github-pr-review
    description: "GitHub PR 建立時自動審查程式碼"
    mapping: |
      收到 GitHub Pull Request 事件：

      **儲存庫**：{{repository.full_name}}
      **標題**：{{pull_request.title}}
      **作者**：{{pull_request.user.login}}
      **描述**：{{pull_request.body}}
      **變更檔案數**：{{pull_request.changed_files}}
      **新增行數**：+{{pull_request.additions}}
      **刪除行數**：-{{pull_request.deletions}}

      請審查此 PR：
      1. 檢查程式碼品質和最佳實踐
      2. 尋找潛在的 bug 和安全問題
      3. 提供改進建議
      4. 以友善、建設性的方式回饋`},u={name:n,description:e,content:t};export{t as content,u as default,e as description,n as name};
