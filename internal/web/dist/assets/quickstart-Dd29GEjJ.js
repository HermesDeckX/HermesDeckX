const n="クイックスタート",e="5分でHermesAgentゲートウェイのインストール、設定、初回会話を完了する",t={body:`## 前提条件

- Node.js 22+（LTS バージョン推奨）
- いずれかの AI プロバイダーの API キー（OpenAI / Anthropic / Google など）

## 手順

### 1. HermesAgent のインストール

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. 設定の初期化

\`\`\`bash
hermesagent init
\`\`\`

プロンプトに従って選択：
- AI プロバイダー（OpenAI または Anthropic を推奨）
- API キーを入力
- デフォルトモデルを選択

### 3. ゲートウェイの起動

\`\`\`bash
hermesagent gateway run
\`\`\`

ゲートウェイ起動後、ターミナルにアクセスアドレスが表示されます（デフォルト http://localhost:18789）。

### 4. HermesDeckX の接続

HermesDeckX を開き、設定でゲートウェイアドレスを入力すれば、会話を開始できます。

### 5. チャットチャンネルの接続（オプション）

Telegram / Discord などから使用したい場合：
1. 「設定センター → チャンネル」へ
2. チャンネルタイプを選択
3. Bot トークンを入力
4. 保存して接続を待つ

## 次のステップ

- [マルチチャンネルルーティング](/knowledge/tips/multi-channel-routing)を設定
- [セキュリティ強化](/knowledge/tips/security-hardening)を設定
- [シナリオテンプレートライブラリ](/scenarios)を探索`,steps:["Node.js 22+ と npm をインストール","npm install -g hermesagent@latest を実行","hermesagent init を実行して設定を初期化","AI プロバイダーの API キーを入力","hermesagent gateway run でゲートウェイを起動","HermesDeckX を開いてゲートウェイに接続"]},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
