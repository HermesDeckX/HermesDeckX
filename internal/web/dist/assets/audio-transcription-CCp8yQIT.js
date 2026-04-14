const n="语音转写",e="启用语音消息自动转写功能，让 AI 助手能理解和回复语音消息",p={body:`## 语音转写功能

很多用户在 Telegram、WhatsApp、Discord 中习惯发送语音消息。启用语音转写后，HermesAgent 会自动将语音消息转为文字，让 AI 助手能理解并回复。

## 在 HermesDeckX 中配置

前往「配置中心 → 音频」→ 找到「语音转写」区域：

1. 打开「启用语音转写」开关
2. 选择转写提供商（默认使用 OpenAI Whisper）
3. 保存即可

## 工作原理

1. 用户在消息频道中发送语音消息
2. HermesAgent 自动下载音频文件
3. 调用 Whisper API 将音频转为文字
4. 将转写文本作为用户消息传递给 AI 模型
5. AI 以文字方式回复

## 注意事项

- 需要 OpenAI API Key（Whisper 是 OpenAI 的服务）
- 每次转写会产生少量 API 费用（约 $0.006/分钟）
- 支持的音频格式：mp3、mp4、mpeg、mpga、m4a、wav、webm
- 最大音频时长取决于提供商限制

## 配置字段

对应配置路径：\`audio.transcription\``},s={name:n,description:e,content:p};export{p as content,s as default,e as description,n as name};
