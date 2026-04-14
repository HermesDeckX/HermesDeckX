const n="채널 연결 끊김",e="메시지 채널(Telegram, Discord, WhatsApp 등)의 연결 끊김 또는 메시지 송수신 불가 문제 해결",o={question:"메시지 채널이 연결 끊김 또는 메시지를 보내거나 받을 수 없는 경우 어떻게 하나요?",answer:`## 문제 해결 단계

### 1. 대시보드에서 채널 상태 확인
HermesDeckX 대시보드를 열고 채널 목록의 상태 표시등을 확인합니다:
- 🟢 연결됨 — 정상
- 🔴 연결 끊김 — 문제 해결 필요
- 🟡 연결 중 — 대기 또는 재시도 중

### 2. 토큰 유효성 확인
「설정 센터 → 채널」에서 해당 채널의 토큰을 확인합니다:
- **Telegram** — 토큰이 BotFather에 의해 재설정되었을 수 있습니다. BotFather에서 확인하세요
- **Discord** — 토큰이 Developer Portal에서 재설정되었을 수 있습니다. discord.com/developers에서 확인하세요
- **WhatsApp** — QR코드 세션이 만료되었을 수 있습니다. 다시 스캔해야 합니다

### 3. 네트워크 연결 확인
- Telegram과 Discord는 API 서버 접근이 필요합니다
- WhatsApp은 WebSocket 연결을 사용하며 안정적인 네트워크가 필요합니다
- 프록시 환경인 경우 프록시 설정이 올바른지 확인하세요

### 4. 채널 설정 확인
- 채널의 \`enabled\`가 false로 설정되지 않았는지 확인
- \`allowFrom\` 규칙에 의해 잘못 차단되지 않았는지 확인 (사용자 ID가 화이트리스트에 없는 경우)

### 5. 재연결
- 대시보드에서 채널의 「재연결」 버튼을 클릭
- 또는 「설정 센터 → 채널」에서 설정을 저장하여 재연결 트리거
- 최후 수단: 게이트웨이 재시작

### 6. WhatsApp 특수 사항
- WhatsApp 연결은 Web 프로토콜 기반이며 스마트폰의 네트워크 연결이 필요합니다
- 오랫동안 사용하지 않은 경우 다시 스캔이 필요할 수 있습니다
- 스마트폰에 「다른 기기에서 로그인 중」 알림이 뜨지 않는지 확인하세요

## 빠른 수정

「헬스 센터」에서 진단 실행 → channel.connected 항목 확인 → 안내에 따라 조치하세요.`},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
