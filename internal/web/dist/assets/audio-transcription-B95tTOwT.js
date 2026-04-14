const n="Audio Transcription",e="Enable automatic voice message transcription so your AI can understand and reply to voice messages",s={body:`## Voice Transcription Feature

Many users send voice messages on Telegram, WhatsApp, and Discord. With voice transcription enabled, HermesAgent automatically converts voice messages to text so the AI assistant can understand and respond.

## Configure in HermesDeckX

Go to Config Center → Audio → Find the "Voice Transcription" area:

1. Turn on "Enable Voice Transcription"
2. Select the transcription provider (default uses OpenAI Whisper)
3. Save

## How It Works

1. User sends a voice message in a messaging channel
2. HermesAgent automatically downloads the audio file
3. Calls Whisper API to convert audio to text
4. Passes the transcribed text to the AI model as user message
5. AI responds in text

## Notes

- Requires an OpenAI API Key (Whisper is an OpenAI service)
- Each transcription incurs a small API fee (~$0.006/minute)
- Supported audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
- Maximum audio duration depends on provider limits

## Configuration Field

Config path: \`audio.transcription\``},a={name:n,description:e,content:s};export{s as content,a as default,e as description,n as name};
