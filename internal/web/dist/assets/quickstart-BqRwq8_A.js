const n="빠른 시작",e="5분 안에 HermesAgent 게이트웨이 설치, 설정 및 첫 대화 완료",t={body:`## 사전 요구사항

- Node.js 22+ (LTS 버전 권장)
- AI 제공자의 API 키 (OpenAI / Anthropic / Google 등)

## 단계

### 1. HermesAgent 설치

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. 설정 초기화

\`\`\`bash
hermesagent init
\`\`\`

프롬프트에 따라 선택:
- AI 제공자 (OpenAI 또는 Anthropic 권장)
- API 키 입력
- 기본 모델 선택

### 3. 게이트웨이 시작

\`\`\`bash
hermesagent gateway run
\`\`\`

게이트웨이 시작 후 터미널에 접근 주소가 표시됩니다 (기본 http://localhost:18789).

### 4. HermesDeckX 연결

HermesDeckX를 열고 설정에서 게이트웨이 주소를 입력하면 대화를 시작할 수 있습니다.

### 5. 채팅 채널 연결 (선택사항)

Telegram / Discord 등에서 사용하려면:
1. 「설정 센터 → 채널」로 이동
2. 채널 유형 선택
3. Bot 토큰 입력
4. 저장 후 연결 대기`,steps:["Node.js 22+와 npm 설치","npm install -g hermesagent@latest 실행","hermesagent init으로 설정 초기화","AI 제공자의 API 키 입력","hermesagent gateway run으로 게이트웨이 시작","HermesDeckX를 열어 게이트웨이에 연결"]},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
