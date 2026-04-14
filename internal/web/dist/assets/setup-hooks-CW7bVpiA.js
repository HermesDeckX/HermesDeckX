const n="Webhook フックの設定",o="Webhook を使用して外部イベント（GitHub、監視アラートなど）を AI に送信して処理させる",e={body:`## Hooks とは？

Hooks（フック）は外部システムが HermesAgent にイベントをプッシュできるようにします。AI はイベントを受信すると自動的に処理し、結果を報告できます。

## よくある使用シナリオ

| シナリオ | ソース | AI の処理 |
|---------|--------|----------|
| コードレビュー | GitHub Webhook | AI が PR をレビューしコメント |
| サーバーアラート | 監視システム | AI がアラートを分析し通知 |
| フォーム送信 | Web フォーム | AI が処理して返信 |
| スケジュールトリガー | Cron サービス | AI が定期タスクを実行 |

## HermesDeckX での設定

「設定センター → フック」へ：

### 1. フックの作成
- 「フックを追加」をクリック
- 名前と説明を設定
- システムがユニークな Webhook URL を生成

### 2. マッピングの設定
イベントを AI 指示にマッピングする方法を定義：
\`\`\`yaml
hooks:
  - name: github-pr
    mapping: |
      GitHub PR イベントを受信：
      リポジトリ：{{repo}}
      タイトル：{{title}}
      この PR をレビューしてフィードバックしてください。
\`\`\`

### 3. 外部システムでの設定
生成された Webhook URL を外部システム（GitHub → Settings → Webhooks など）に入力。

## セキュリティ

- 各フックにはユニークなシークレットキーがあります
- HMAC 署名検証をサポート
- ソース IP を制限可能

## 設定フィールド

対応する設定パス：\`hooks\``,steps:["「設定センター → フック」へ","新しいフックを作成し名前を設定","イベントマッピングテンプレートを定義","生成された Webhook URL をコピー","外部システムで Webhook をこの URL に設定"]},t={name:n,description:o,content:e};export{e as content,t as default,o as description,n as name};
