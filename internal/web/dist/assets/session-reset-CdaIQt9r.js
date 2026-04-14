const n="セッション自動リセット",e="日次/週次の自動セッションリセットを設定し、コンテキストの無限増大によるコスト上昇を防止",t={body:`## セッションを自動リセットする理由

リセットしない場合：
- コンテキストが無限に増大し、各リクエストでより多くのトークンを送信
- 古い無関係な情報がレスポンス品質を低下
- API コストが時間とともに上昇し続ける

## HermesDeckX での設定

「設定センター → セッション → 自動リセット」へ：

### コアパラメータ
- **enabled** — 自動リセットを有効化
- **every** — リセット間隔
  - \`24h\` — 毎日リセット（ほとんどのユーザーに推奨）
  - \`12h\` — 1日2回リセット
  - \`7d\` — 毎週リセット（長期プロジェクト向け）
- **at** — リセット時刻（例："04:00" 午前4時、使用が少ない時間帯）
- **timezone** — リセット時刻のタイムゾーン

### 重要情報の保持
- **keepMemory** — 有効にすると、MEMORY.md の内容がリセット後も保持される
- 圧縮設定で \`memoryFlush\` を有効にし、重要情報をリセット前に MEMORY.md に自動保存

## 推奨設定

**日常使用：**
\`\`\`json
"autoReset": { "enabled": true, "every": "24h", "at": "04:00", "keepMemory": true }
\`\`\`

**コーディングプロジェクト：**
\`\`\`json
"autoReset": { "enabled": true, "every": "7d", "keepMemory": true }
\`\`\`

## 設定フィールド

対応する設定パス：\`session.autoReset\``},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
