const e="Telegram Bot の設定",n="Telegram Bot を作成し HermesAgent ゲートウェイに接続する",t={body:`## Telegram Bot の作成

### 1. BotFather で Bot を作成
1. Telegram で @BotFather を検索
2. \`/newbot\` を送信
3. Bot 名を入力（表示名）
4. Bot ユーザー名を入力（\`bot\` で終わる必要あり）
5. BotFather がトークンを返すのでコピー

### 2. HermesDeckX での設定
1. 「設定センター → チャンネル」へ
2. 「チャンネルを追加」→ Telegram を選択
3. Bot トークンを貼り付け
4. 設定を保存

### 3. 接続の確認
- ダッシュボードで Telegram チャンネルが 🟢 表示されるはず
- Telegram で Bot にメッセージを送信
- Bot が返信するはず

## 詳細設定

### アクセス制御
- \`allowFrom\` で使用可能なユーザー ID を制限
- \`dmPolicy\` で DM アクセスを制御

### グループでの使用
- Bot をグループに追加
- \`groupPolicy\` でグループ返信動作を制御
- デフォルトでは Bot は @メンション のメッセージのみに返信

## ユーザー ID の取得
@userinfobot にメッセージを送信すると Telegram ユーザー ID を取得できます。

## 設定フィールド

対応する設定パス：\`channels[].type: "telegram"\``,steps:["Telegram で @BotFather を見つける","/newbot を送信して新しい Bot を作成","BotFather が返すトークンをコピー","HermesDeckX 設定センターで Telegram チャンネルを追加","トークンを貼り付けて保存"]},o={name:e,description:n,content:t};export{t as content,o as default,n as description,e as name};
