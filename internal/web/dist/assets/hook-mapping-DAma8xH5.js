const n="GitHub PR フックマッピング",e="Webhook マッピングスニペット：GitHub Pull Request イベントを AI コードレビュー指示に変換",t={snippet:`hooks:
  - name: github-pr-review
    description: "GitHub PR 作成時に自動コードレビュー"
    mapping: |
      GitHub Pull Request イベントを受信：

      **リポジトリ**：{{repository.full_name}}
      **タイトル**：{{pull_request.title}}
      **作成者**：{{pull_request.user.login}}
      **説明**：{{pull_request.body}}
      **変更ファイル数**：{{pull_request.changed_files}}
      **追加行数**：+{{pull_request.additions}}
      **削除行数**：-{{pull_request.deletions}}

      この PR をレビューしてください：
      1. コード品質とベストプラクティスをチェック
      2. 潜在的なバグとセキュリティ問題を探す
      3. 改善提案を提供
      4. フレンドリーで建設的なフィードバックを提供`},u={name:n,description:e,content:t};export{t as content,u as default,e as description,n as name};
