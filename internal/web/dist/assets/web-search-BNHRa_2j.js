const n="ウェブ検索強化",e="ウェブ検索を有効にして AI アシスタントが最新情報をリアルタイムで検索可能に。Brave、Perplexity、Gemini、Grok、Kimi をサポート",o={body:`## ウェブ検索を有効にする理由

AI モデルのトレーニングデータにはカットオフ日があり、最新情報を取得できません。ウェブ検索を有効にすると、AI アシスタントは：
- 最新ニュース、天気、株価などのリアルタイム情報を検索
- 技術ドキュメントや API リファレンスを検索
- 自身の知識の正確性を検証

## サポートされる検索プロバイダー

| プロバイダー | 特徴 | API キー |
|------------|------|----------|
| **Brave** | プライバシー優先、無料枠あり | 必要 |
| **Perplexity** | AI 強化検索結果 | 必要 |
| **Gemini** | Google 検索能力 | 必要（Google プロバイダーと共用） |
| **Grok** | X プラットフォーム統合、高リアルタイム性 | 必要 |
| **Kimi** | 中国語検索最適化 | 必要 |

## HermesDeckX での設定

1. 「設定センター → ツール」へ
2. 「ウェブ検索」エリアを見つける
3. 「ウェブ検索を有効化」スイッチをオン
4. 検索プロバイダーを選択
5. 対応する API キーを入力

## 調整可能なパラメータ

- **maxResults** — 検索ごとの最大結果数（デフォルト 5）
- **timeoutSeconds** — 検索タイムアウト
- **cacheTtlMinutes** — 検索結果のキャッシュ時間

## ウェブフェッチとの組合せ

検索に加えて、ウェブフェッチ（web fetch）を有効にすると AI が検索結果の完全なページコンテンツを読めるようになります。

## 設定フィールド

対応する設定パス：\`tools.web.search.enabled\` と \`tools.web.search.provider\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
