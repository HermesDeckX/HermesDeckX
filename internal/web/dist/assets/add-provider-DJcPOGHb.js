const n="AI 제공자 추가",e="OpenAI, Anthropic, Google 등 AI 모델 제공자의 API 키와 옵션 설정",o={body:`## 지원되는 제공자

| 제공자 | 모델 예시 | 특징 |
|--------|---------|------|
| **OpenAI** | GPT-4o, GPT-4o-mini | 가장 성숙한 생태계 |
| **Anthropic** | Claude Sonnet, Claude Haiku | 높은 안전성, 긴 컨텍스트 |
| **Google** | Gemini Pro, Gemini Flash | 멀티모달, 저비용 |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | 높은 가성비 |
| **xAI** | Grok | X 플랫폼 통합 |
| **Ollama** | Llama, Mistral 등 | 로컬 배포, 무료 |

## HermesDeckX에서 설정

1. 「설정 센터 → 모델 제공자」로 이동
2. 「제공자 추가」 클릭
3. 제공자 유형 선택
4. API 키 입력
5. 활성화할 모델 선택
6. 설정 저장

## API 키 획득 방법

- **OpenAI**: platform.openai.com → API Keys
- **Anthropic**: console.anthropic.com → API Keys
- **Google**: aistudio.google.com → API 키 가져오기
- **DeepSeek**: platform.deepseek.com → API Keys

## 설정 필드

해당 설정 경로: \`providers\``,steps:["「설정 센터 → 모델 제공자」로 이동","「제공자 추가」 클릭","제공자 유형 선택 및 API 키 입력","활성화할 모델 선택","설정 저장"]},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
