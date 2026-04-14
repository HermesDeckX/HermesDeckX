const n="Discord Bot の設定",o="Discord Bot を作成し HermesAgent ゲートウェイに接続する",e={body:`## Discord Bot の作成

### 1. Discord アプリケーションの作成
1. discord.com/developers/applications へ
2. 「New Application」をクリック
3. アプリ名を入力
4. 「Bot」ページへ
5. 「Add Bot」をクリック

### 2. トークンの取得
1. Bot ページで「Reset Token」をクリック
2. 新しいトークンをコピー
3. 「Message Content Intent」を有効にする（重要！）

### 3. Bot をサーバーに招待
1. 「OAuth2 → URL Generator」へ
2. \`bot\` 権限を選択
3. 必要な Bot 権限を選択（Send Messages、Read Message History など）
4. 生成された URL をコピーしてブラウザで開く
5. 追加するサーバーを選択

### 4. HermesDeckX での設定
1. 「設定センター → チャンネル」へ
2. 「チャンネルを追加」→ Discord を選択
3. Bot トークンを貼り付け
4. 設定を保存

### 5. 確認
- ダッシュボードで Discord チャンネルが 🟢 表示されるはず
- Discord で Bot を @メンション するか DM を送信
- Bot が返信するはず

## 設定フィールド

対応する設定パス：\`channels[].type: "discord"\``,steps:["Discord Developer Portal でアプリケーションを作成","Bot を作成しトークンをコピー","Message Content Intent を有効にする","招待リンクを生成し Bot をサーバーに追加","HermesDeckX 設定センターで Discord チャンネルを追加","トークンを貼り付けて保存"]},t={name:n,description:o,content:e};export{e as content,t as default,o as description,n as name};
