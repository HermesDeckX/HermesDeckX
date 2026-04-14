const n="AI プロバイダーの追加",e="OpenAI、Anthropic、Google などの AI モデルプロバイダーの API キーとオプションを設定する",o={body:`## サポートされているプロバイダー

| プロバイダー | モデル例 | 特徴 |
|------------|---------|------|
| **OpenAI** | GPT-4o, GPT-4o-mini | 最も成熟したエコシステム |
| **Anthropic** | Claude Sonnet, Claude Haiku | 安全性が高く、長いコンテキスト |
| **Google** | Gemini Pro, Gemini Flash | マルチモーダル、低コスト |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | 高コストパフォーマンス |
| **xAI** | Grok | X プラットフォーム統合 |
| **Ollama** | Llama, Mistral など | ローカルデプロイ、無料 |

## HermesDeckX での設定

1. 「設定センター → モデルプロバイダー」へ
2. 「プロバイダーを追加」をクリック
3. プロバイダータイプを選択
4. API キーを入力
5. 有効にするモデルを選択
6. 設定を保存

## API キーの取得方法

- **OpenAI**: platform.openai.com → API Keys
- **Anthropic**: console.anthropic.com → API Keys
- **Google**: aistudio.google.com → API キーを取得
- **DeepSeek**: platform.deepseek.com → API Keys

## カスタムエンドポイント

OpenAI API 互換プロバイダー（ローカル LLM サーバーなど）の場合、カスタムエンドポイントを設定できます：
- 「OpenAI Compatible」タイプを選択
- カスタム API エンドポイント URL を入力
- API キーを入力（必要な場合）

## 設定フィールド

対応する設定パス：\`providers\``,steps:["「設定センター → モデルプロバイダー」へ","「プロバイダーを追加」をクリック","プロバイダータイプを選択し API キーを入力","有効にするモデルを選択","設定を保存"]},p={name:n,description:e,content:o};export{o as content,p as default,e as description,n as name};
