const n="음성 텍스트 변환",o="음성 텍스트 변환을 활성화하여 AI 어시스턴트가 음성 메시지를 이해할 수 있게 합니다. Whisper, Groq, Gemini 등 제공자 지원",i={body:`## 음성 텍스트 변환을 활성화하는 이유

많은 채팅 플랫폼이 음성 메시지를 지원합니다. 음성 텍스트 변환을 활성화하면 AI 어시스턴트가:
- 음성 메시지를 자동으로 텍스트로 변환
- 음성 콘텐츠를 이해하고 응답
- 다국어 음성 인식 지원

## 지원되는 제공자

| 제공자 | 특징 | 비용 |
|--------|------|------|
| **OpenAI Whisper** | 높은 정확도, 다국어 | 시간당 과금 |
| **Groq** | 초고속 | 시간당 과금 |
| **Gemini** | 멀티모달 네이티브 | 토큰당 과금 |

## HermesDeckX에서 설정

1. 「설정 센터 → 도구」로 이동
2. 「음성 텍스트 변환」 영역 찾기
3. 스위치 켜기
4. 제공자 선택
5. 해당 제공자의 API 키가 설정되어 있는지 확인

## 설정 필드

해당 설정 경로: \`tools.audio.transcription\``},e={name:n,description:o,content:i};export{i as content,e as default,o as description,n as name};
