const n="デイリーサマリーハートビート",t="ハートビート設定スニペット：毎朝ニュース、天気、TODOのサマリーを送信",o={snippet:`## ハートビートチェック

| チェック項目 | アクション |
|------------|----------|
| デイリーサマリー | 今日の天気と重要ニュースを確認し、朝のサマリーを送信 |
| TODOリマインダー | 今日期限のタスクをチェック |
| カレンダーイベント | 今日のスケジュールイベントをチェック |

通知不要の場合は \`target: "none"\` を使用`},e={name:n,description:t,content:o};export{o as content,e as default,t as description,n as name};
